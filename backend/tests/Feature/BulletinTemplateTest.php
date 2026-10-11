<?php

namespace Tests\Feature;

use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\Country;
use App\Models\Grade;
use App\Models\Level;
use App\Models\ParentStudent;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\SchoolUser;
use App\Models\SchoolYear;
use App\Models\Season;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Bulletins configurables par section : rang (ex aequo), moyenne de classe,
 * plus forte / plus faible, distinctions, barème sur 10, seuil de passage,
 * poids par type d'évaluation, bulletins de toute la classe.
 */
class BulletinTemplateTest extends TestCase
{
    use DatabaseTransactions;

    private School $school;

    private Section $section;

    private SchoolClass $class;

    private Season $t1;

    private Season $t2;

    private User $admin;

    /** @var array<string, Student> */
    private array $students = [];

    private ClassSubjectTeacher $maths;

    private ClassSubjectTeacher $french;

    protected function setUp(): void
    {
        parent::setUp();

        $country = Country::query()->firstOrCreate(['iso_code' => 'BF'], ['name' => 'Burkina Faso', 'currency' => 'XOF']);
        $this->school = School::query()->create([
            'country_id' => $country->id, 'name' => 'École Bulletins Test',
            'status' => School::STATUS_ACTIVE, 'plan' => School::PLAN_ECOLE,
            'language' => School::LANGUAGE_FR, 'currency' => 'XOF',
        ]);
        $this->section = Section::query()->create(['name' => 'Post-primaire Test', 'code' => 'PP'.uniqid()]);
        $this->school->sections()->attach($this->section->id, ['active' => true]);
        $level = Level::query()->create(['section_id' => $this->section->id, 'name' => '6e', 'code' => '6B'.uniqid(), 'order' => 1]);
        $year = SchoolYear::query()->create([
            'school_id' => $this->school->id, 'label' => '2026-2027',
            'start_date' => now()->subMonth(), 'end_date' => now()->addMonths(8), 'is_current' => true,
        ]);
        $this->t1 = Season::query()->create(['school_id' => $this->school->id, 'school_year_id' => $year->id, 'type' => 'trimestre', 'label' => '1er trimestre', 'order' => 1, 'start_date' => now()->subMonth(), 'end_date' => now()->addMonth()]);
        $this->t2 = Season::query()->create(['school_id' => $this->school->id, 'school_year_id' => $year->id, 'type' => 'trimestre', 'label' => '2e trimestre', 'order' => 2, 'start_date' => now()->addMonth(), 'end_date' => now()->addMonths(3)]);
        $this->class = SchoolClass::query()->create(['school_id' => $this->school->id, 'level_id' => $level->id, 'school_year_id' => $year->id, 'name' => '6e A']);

        $teacher = User::factory()->create(['fullname' => 'Prof Test']);
        $this->maths = ClassSubjectTeacher::query()->create(['class_id' => $this->class->id, 'subject_id' => Subject::query()->create(['school_id' => $this->school->id, 'name' => 'Mathématiques', 'code' => 'M'])->id, 'user_id' => $teacher->id, 'coefficient' => 3]);
        $this->french = ClassSubjectTeacher::query()->create(['class_id' => $this->class->id, 'subject_id' => Subject::query()->create(['school_id' => $this->school->id, 'name' => 'Français', 'code' => 'F'])->id, 'user_id' => $teacher->id, 'coefficient' => 1]);

        foreach (['Awa', 'Bachir', 'Céline'] as $name) {
            $student = Student::query()->create(['fullname' => $name, 'date_of_birth' => '2014-01-01', 'gender' => 'F']);
            SchoolStudent::query()->create(['school_id' => $this->school->id, 'student_id' => $student->id, 'status' => SchoolStudent::STATUS_ACTIVE]);
            ClassStudent::query()->create(['class_id' => $this->class->id, 'student_id' => $student->id, 'status' => ClassStudent::STATUS_ACTIVE]);
            $this->students[$name] = $student;
        }

        // 1er trimestre (sur 20), coefficient de note 1 :
        // Awa   : maths 16, français 12 → (16×3 + 12×1) / 4 = 15
        // Bachir: maths 16, français 12 → 15 (ex aequo avec Awa)
        // Céline: maths 6,  français 10 → (18 + 10) / 4 = 7
        foreach (['Awa' => [16, 12], 'Bachir' => [16, 12], 'Céline' => [6, 10]] as $name => [$math, $fr]) {
            $this->grade($this->maths, $name, $math);
            $this->grade($this->french, $name, $fr);
        }

        $this->admin = $this->member('admin');
    }

    public function test_period_bulletin_with_rank_class_stats_and_distinctions(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson($this->url('Céline'))->assertOk();
        $response->assertJsonPath('overall_average', 7)
            ->assertJsonPath('rank', 3) // 15, 15, 7 → 1, 1, 3
            ->assertJsonPath('class_size', 3)
            ->assertJsonPath('class_average', 12.33)
            ->assertJsonPath('distinction', 'Avertissement (travail)') // < 8 par défaut
            ->assertJsonPath('decision', null) // pas de décision sur un trimestre
            ->assertJsonPath('subjects.0.subject', 'Mathématiques')
            ->assertJsonPath('subjects.0.min', 6)
            ->assertJsonPath('subjects.0.max', 16)
            ->assertJsonPath('subjects.0.rank', 3)
            ->assertJsonPath('template.grading_scale', 20);

        $this->getJson($this->url('Awa'))
            ->assertJsonPath('rank', 1)
            ->assertJsonPath('distinction', 'Encouragements'); // 15 ≥ 14
    }

    public function test_scale_threshold_and_weights_follow_the_section_template(): void
    {
        Sanctum::actingAs($this->admin);
        $templateUrl = "/api/schools/{$this->school->id}/bulletin-templates/{$this->section->id}";

        // Seuil supérieur au barème refusé.
        $this->putJson($templateUrl, $this->template(['grading_scale' => 10, 'pass_threshold' => 12]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('pass_threshold');

        $this->putJson($templateUrl, $this->template([
            'grading_scale' => 10,
            'pass_threshold' => 4,
            'distinctions' => [['label' => 'Bravo', 'condition' => 'gte', 'value' => 7]],
        ]))->assertOk();

        // Bulletin annuel : Céline 7/20 → 3,5/10 < seuil 4 → redouble.
        $this->getJson($this->url('Céline', annual: true))
            ->assertOk()
            ->assertJsonPath('overall_average', 3.5)
            ->assertJsonPath('decision', 'Doit redoubler')
            ->assertJsonPath('passed', false)
            ->assertJsonPath('mention', 'Doit redoubler')
            ->assertJsonPath('template.grading_scale', 10);
        $this->getJson($this->url('Awa', annual: true))
            ->assertJsonPath('overall_average', 7.5)
            ->assertJsonPath('distinction', 'Bravo')
            ->assertJsonPath('decision', 'Admis(e) en classe supérieure');

        // Poids par type : la composition compte double, le devoir simple.
        $this->grade($this->maths, 'Céline', 20, Grade::TYPE_COMPOSITION, coefficient: 1);
        $this->putJson($templateUrl, $this->template([
            'calculation_mode' => 'type_weights',
            'evaluation_weights' => ['devoir' => 1, 'composition' => 2],
        ]))->assertOk();
        // Maths Céline : (6×1 + 20×2) / 3 = 15.33 /20
        $this->getJson($this->url('Céline'))->assertJsonPath('subjects.0.average', 15.33);
    }

    public function test_class_bulletins_admin_only_and_parent_sees_own_child(): void
    {
        $classUrl = "/api/schools/{$this->school->id}/classes/{$this->class->id}/bulletins?season_id={$this->t1->id}";

        Sanctum::actingAs($this->admin);
        $this->getJson($classUrl)
            ->assertOk()
            ->assertJsonCount(3, 'bulletins')
            ->assertJsonPath('bulletins.0.student.fullname', 'Awa');

        $parent = $this->member('parent');
        ParentStudent::query()->create(['parent_user_id' => $parent->id, 'student_id' => $this->students['Awa']->id, 'relationship' => 'Mère']);
        Sanctum::actingAs($parent);
        $this->getJson($classUrl)->assertForbidden();
        $this->getJson($this->url('Awa'))->assertOk()->assertJsonPath('rank', 1);
        $this->getJson($this->url('Bachir'))->assertForbidden();
    }

    private function url(string $name, bool $annual = false): string
    {
        $base = "/api/schools/{$this->school->id}/students/{$this->students[$name]->id}/bulletin";

        return $annual ? $base : $base.'?season_id='.$this->t1->id;
    }

    private function grade(ClassSubjectTeacher $course, string $name, float $score, string $type = Grade::TYPE_DEVOIR, float $coefficient = 1): void
    {
        Grade::query()->create([
            'class_subject_teacher_id' => $course->id,
            'student_id' => $this->students[$name]->id,
            'season_id' => $this->t1->id,
            'evaluation_type' => $type,
            'title' => 'Évaluation',
            'score' => $score,
            'max_score' => 20,
            'coefficient' => $coefficient,
            'graded_at' => now(),
        ]);
    }

    private function template(array $overrides): array
    {
        return $overrides + [
            'grading_scale' => 20,
            'calculation_mode' => 'grade_coefficient',
            'pass_label' => 'Admis(e) en classe supérieure',
            'fail_label' => 'Doit redoubler',
            'distinctions' => [],
        ];
    }

    private function member(string $slug): User
    {
        $user = User::factory()->create();
        SchoolUser::query()->create([
            'school_id' => $this->school->id, 'user_id' => $user->id,
            'role_id' => Role::query()->firstOrCreate(['slug' => $slug], ['name' => ucfirst($slug)])->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);

        return $user;
    }
}
