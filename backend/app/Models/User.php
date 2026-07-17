<?php

namespace App\Models;

use Illuminate\Auth\MustVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Models\ParentStudent;
use App\Models\ClassSubjectTeacher;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;

#[Fillable(['fullname', 'email', 'phone', 'password', 'language', 'current_school_id', 'role_id', 'terms_accepted_version', 'terms_accepted_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmailContract
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuids, MustVerifyEmail, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'terms_accepted_at' => 'datetime',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function schools(): BelongsToMany
    {
        return $this->belongsToMany(School::class, 'school_users')
            ->using(SchoolUser::class)
            ->withPivot('role_id', 'status')
            ->withTimestamps();
    }

    public function studentProfile(): HasOne
    {
        return $this->hasOne(Student::class);
    }

    public function childStudents(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'parent_student', 'parent_user_id', 'student_id')
            ->using(ParentStudent::class)
            ->withPivot('relationship', 'is_primary_contact')
            ->withTimestamps();
    }

    public function teachingAssignments(): HasMany
    {
        return $this->hasMany(ClassSubjectTeacher::class, 'user_id');
    }

    public function currentSchool(): BelongsTo
    {
        return $this->belongsTo(School::class, 'current_school_id');
    }

    /**
     * L'app est une API pure (pas de vue Blade) : le lien de réinitialisation
     * pointe vers la page du frontend React, pas une route nommée Laravel.
     */
    public function sendPasswordResetNotification($token): void
    {
        $url = rtrim(config('app.frontend_url'), '/')."/reset-password?token={$token}&email={$this->email}";

        $this->notify(new ResetPasswordNotification($url));
    }

    /**
     * Idem : le lien de vérification pointe vers une page du frontend React
     * qui rappellera ensuite la route signée du backend avec les mêmes
     * paramètres (id, hash, expires, signature) pour valider la signature.
     */
    public function sendEmailVerificationNotification(): void
    {
        $signedUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $this->getKey(), 'hash' => sha1($this->getEmailForVerification())]
        );

        $query = parse_url($signedUrl, PHP_URL_QUERY);
        $url = rtrim(config('app.frontend_url'), '/')
            ."/verify-email?id={$this->getKey()}&hash=".sha1($this->getEmailForVerification())."&{$query}";

        $this->notify(new VerifyEmailNotification($url));
    }
}
