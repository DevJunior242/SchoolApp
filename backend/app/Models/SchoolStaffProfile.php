<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchoolStaffProfile extends Model
{
    use HasUuids;

    public const EMPLOYMENT_FULL_TIME = 1;
    public const EMPLOYMENT_PART_TIME = 2;
    public const EMPLOYMENT_CONTRACT = 3;
    public const EMPLOYMENT_TEMPORARY = 4;

    public const CONTRACT_CDI = 1;
    public const CONTRACT_CDD = 2;
    public const CONTRACT_STAGE = 3;
    public const CONTRACT_VACATAIRE = 4;

    protected $table = 'school_staff_profiles';

    protected $fillable = [
        'school_id',
        'user_id',
        'department',
        'position',
        'employment_status',
        'hire_date',
        'monthly_salary',
        'contract_type',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function employmentStatusLabel(?int $value): ?string
    {
        return match ($value) {
            self::EMPLOYMENT_FULL_TIME => 'Temps plein',
            self::EMPLOYMENT_PART_TIME => 'Temps partiel',
            self::EMPLOYMENT_CONTRACT => 'Contrat',
            self::EMPLOYMENT_TEMPORARY => 'Temporaire',
            default => null,
        };
    }

    public static function contractTypeLabel(?int $value): ?string
    {
        return match ($value) {
            self::CONTRACT_CDI => 'CDI',
            self::CONTRACT_CDD => 'CDD',
            self::CONTRACT_STAGE => 'Stage',
            self::CONTRACT_VACATAIRE => 'Vacataire',
            default => null,
        };
    }
}
