<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
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
use Laravel\Sanctum\HasApiTokens;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Models\ParentStudent;
use App\Models\ClassSubjectTeacher;

#[Fillable(['fullname', 'email', 'phone', 'password', 'language', 'current_school_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

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
        ];
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

        $this->notify(new \App\Notifications\ResetPasswordNotification($url));
    }
}
