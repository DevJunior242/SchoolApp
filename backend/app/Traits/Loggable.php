<?php

namespace App\Traits;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

trait Loggable
{

    public static function bootLoggable()
    {

        static::created(function ($model) {
            self::logAction('created', $model);
        });

        static::updated(function ($model) {
            self::logAction('updated', $model);
        });

        static::deleted(function ($model) {
            self::logAction('deleted', $model);
        });
    }


    private static function logAction($action, $model)
    {
        try {
            $oldValues = null;
            $newValues = null;

            if ($action === 'created') {
                $newValues = $model->getAttributes(); // ✅ Toutes les nouvelles valeurs
            } elseif ($action === 'updated') {
                $oldValues = $model->getOriginal(); // ✅ Les anciennes valeurs
                $newValues = $model->getChanges(); // ✅ Que ce qui a changé
            } elseif ($action === 'deleted') {
                $oldValues = $model->getAttributes(); // ✅ Toutes les valeurs avant suppression
            }

            ActivityLog::create([
                'action' => $action,
                'model' => get_class($model),
                'model_id' => $model->id,
                'user_id' => Auth::id(),
                'school_id' => $model->school_id ?? (Auth::user()->current_school_id ?? null),
                'old_values' => $oldValues ? json_encode($oldValues) : null,
                'new_values' => $newValues ? json_encode($newValues) : null,
            ]);
        } catch (\Exception $e) {
            Log::error('Loggable error', ['error' => $e->getMessage()]);
        }
    }
}
