<?php

namespace App\Models;

use App\Models\User;
use App\Models\Student;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ParentStudent extends Pivot
{
    use HasUuids;

    protected $table = 'parent_student';

    const RELATIONSHIP_PERE = 'pere';

    const RELATIONSHIP_MERE = 'mere';

    const RELATIONSHIP_TUTEUR = 'tuteur';

    const RELATIONSHIP_AUTRE = 'autre';

    protected $fillable = ['parent_user_id', 'student_id', 'relationship', 'is_primary_contact'];

    protected function casts(): array
    {
        return [
            'is_primary_contact' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
