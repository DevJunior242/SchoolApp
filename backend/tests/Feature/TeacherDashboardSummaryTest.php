<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\ClassSubjectTeacher;
use App\Models\Country;
use App\Models\Level;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Subject;
use App\Models\TimetableSlot;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tableau de bord du professeur (GET my-teaching-summary). Régression :
 * un professeur limité à une section faisait planter la requête (filtre sur
 * une colonne classes.section_id inexistante).
 */
class TeacherDashboardSummaryTest extends TestCase
{
    use DatabaseTransactions;

    public function test_section_restricted_teacher_gets_today_classes_with_attendance_status(): void
    {
        $role = Role::query()->firstOrCreate(['slug' => 'professeur'], ['name' => 'Professeur']);
        $country = Country::query()->firstOrCreate(['iso_code' => 'BF'], ['name' => 'Burkina Faso', 'currency' => 'XOF']);
        $school = School::query()->create([
            'country_id' => $country->id,
            'name' => 'École Tableau Prof',
            'status' => School::STATUS_ACTIVE,
            'plan' => School::PLAN_ECOLE,
            'language' => School::LANGUAGE_FR,
            'currency' => 'XOF',
        ]);
        $section = Section::query()->create(['name' => 'Secondaire Test', 'code' => 'SEC-T'.uniqid()]);
        $level = Level::query()->create(['section_id' => $section->id, 'name' => '6e Test', 'code' => '6T'.uniqid(), 'order' => 1]);
        $year = SchoolYear::query()->create([
            'school_id' => $school->id, 'label' => '2026-2027',
            'start_date' => now()->subMonth(), 'end_date' => now()->addMonths(8), 'is_current' => true,
        ]);
        $class = SchoolClass::query()->create([
            'school_id' => $school->id, 'level_id' => $level->id, 'school_year_id' => $year->id, 'name' => '6e A',
        ]);
        $math = Subject::query()->create(['school_id' => $school->id, 'name' => 'Mathématiques', 'code' => 'MATH']);
        $french = Subject::query()->create(['school_id' => $school->id, 'name' => 'Français', 'code' => 'FR']);

        $teacher = User::factory()->create();
        $member = SchoolUser::query()->create([
            'school_id' => $school->id, 'user_id' => $teacher->id,
            'role_id' => $role->id, 'status' => SchoolUser::STATUS_ACTIVE,
        ]);
        $member->sections()->attach($section->id);

        $mathCourse = ClassSubjectTeacher::query()->create(['class_id' => $class->id, 'subject_id' => $math->id, 'user_id' => $teacher->id]);
        $frenchCourse = ClassSubjectTeacher::query()->create(['class_id' => $class->id, 'subject_id' => $french->id, 'user_id' => $teacher->id]);

        foreach ([[$mathCourse, '08:00'], [$frenchCourse, '10:00']] as [$course, $start]) {
            TimetableSlot::query()->create([
                'class_subject_teacher_id' => $course->id,
                'day_of_week' => now()->dayOfWeekIso,
                'start_time' => $start,
                'end_time' => date('H:i', strtotime($start) + 7200),
            ]);
        }

        // Appel déjà fait pour les maths aujourd'hui.
        Attendance::query()->create([
            'class_subject_teacher_id' => $mathCourse->id,
            'student_id' => \App\Models\Student::query()->create(['fullname' => 'Élève Test', 'date_of_birth' => '2014-01-01', 'gender' => 'M'])->id,
            'date' => today(),
            'status' => Attendance::STATUS_PRESENT,
        ]);

        Sanctum::actingAs($teacher);

        $this->getJson("/api/schools/{$school->id}/my-teaching-summary")
            ->assertOk()
            ->assertJsonPath('classes_count', 1)
            ->assertJsonPath('subjects_count', 2)
            ->assertJsonPath('attendance_pending_count', 1)
            ->assertJsonPath('today_slots.0.subject', 'Mathématiques')
            ->assertJsonPath('today_slots.0.attendance_taken', true)
            ->assertJsonPath('today_slots.1.subject', 'Français')
            ->assertJsonPath('today_slots.1.attendance_taken', false)
            ->assertJsonPath('today_slots.1.assignment_id', $frenchCourse->id);
    }
}
