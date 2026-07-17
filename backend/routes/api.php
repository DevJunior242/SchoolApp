<?php

use App\Http\Controllers\Api\ActivationKeyController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BulletinController;
use App\Http\Controllers\Api\ClassController;
use App\Http\Controllers\Api\ClassTeacherController;
use App\Http\Controllers\Api\CountryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EnrollmentRequestController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\LevelController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\FeeStructureController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PaymentMethodController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SchoolController;
use App\Http\Controllers\Api\SchoolMemberController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\TeacherController;
use App\Http\Controllers\Api\TimetableController;
use Illuminate\Support\Facades\Route;

// Routes publiques sensibles (pas d'authentification) : throttle par IP,
// un limiteur nommé dédié par action pour éviter qu'elles se contaminent.
Route::middleware('throttle:register-attempts')->post('/register', [AuthController::class, 'register']);
Route::middleware('throttle:login-attempts')->post('/login', [AuthController::class, 'login']);
Route::middleware('throttle:password-reset')->post('/reset-password', [AuthController::class, 'resetPassword']);

// Plus strict : peut envoyer un email à n'importe quelle adresse sans
// authentification (risque de "email bombing" d'un tiers).
Route::middleware('throttle:password-email')->post('/forgot-password', [AuthController::class, 'forgotPassword']);

Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware('signed')
    ->name('verification.verify');

Route::get('/schools', [SchoolController::class, 'index']);
Route::get('/roles', [RoleController::class, 'index']);
Route::get('/countries', [CountryController::class, 'index']);
Route::get('/levels', [LevelController::class, 'index']);
Route::get('/subjects', [SubjectController::class, 'index']);

// Formulaire public de pré-inscription (homepage) : pas d'authentification,
// throttle serré car c'est une route d'écriture ouverte à tous.
Route::middleware('throttle:enrollment-requests')->post('/schools/{school}/enrollment-requests', [EnrollmentRequestController::class, 'store']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])
        ->middleware('throttle:verification-email');

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);

    Route::get('/my-schools', [SchoolController::class, 'mine']);

    Route::middleware('throttle:activation-key-validate')->post('/activation-keys/validate', [ActivationKeyController::class, 'validateKey']);

    // Ces actions créent des données réelles (école, appartenance) :
    // exigées avec un email vérifié pour limiter les comptes jetables.
    Route::middleware('verified')->group(function () {
        Route::post('/schools', [SchoolController::class, 'store']);
        Route::post('/schools/{school}/join', [SchoolController::class, 'join']);
    });

    Route::middleware('super.admin')->group(function () {
        Route::get('/admin/activation-keys', [ActivationKeyController::class, 'index']);
        Route::post('/admin/activation-keys', [ActivationKeyController::class, 'generate']);

        Route::get('/admin/stats', [AdminController::class, 'stats']);
        Route::get('/admin/schools', [AdminController::class, 'schools']);
        Route::post('/admin/schools/{school}/toggle-status', [AdminController::class, 'toggleSchoolStatus']);
    });

    Route::get('/assignments/{assignment}', [AssignmentController::class, 'show']);
    Route::get('/assignments/{assignment}/students', [GradeController::class, 'students']);
    Route::get('/assignments/{assignment}/grades', [GradeController::class, 'index']);
    Route::get('/assignments/{assignment}/attendances', [AttendanceController::class, 'index']);

    Route::middleware('verified')->group(function () {
        Route::post('/assignments/{assignment}/grades', [GradeController::class, 'store']);
        Route::delete('/assignments/{assignment}/grades/{grade}', [GradeController::class, 'destroy']);
        Route::post('/assignments/{assignment}/attendances', [AttendanceController::class, 'store']);
    });

    // Toutes les routes ci-dessous portent sur une école précise ({school})
    // : ce middleware vérifie que l'utilisateur en est bien membre actif
    // avant de laisser passer, en plus des contrôles de rôle par action.
    Route::middleware('school.member')->group(function () {
        // Changer d'école active n'écrit aucune donnée métier : exempté de
        // la vérification d'email pour ne pas casser la navigation de base.
        Route::post('/schools/{school}/switch', [SchoolController::class, 'switchTo']);

        Route::get('/schools/{school}/settings', [SchoolController::class, 'show']);
        Route::get('/schools/{school}/dashboard-summary', [DashboardController::class, 'summary']);
        Route::get('/schools/{school}/events', [EventController::class, 'index']);
        Route::get('/schools/{school}/enrollment-requests', [EnrollmentRequestController::class, 'index']);
        Route::get('/schools/{school}/members', [SchoolMemberController::class, 'index']);
        Route::get('/schools/{school}/teachers', [TeacherController::class, 'index']);
        Route::get('/schools/{school}/classes', [ClassController::class, 'index']);
        Route::get('/schools/{school}/students', [StudentController::class, 'index']);
        Route::get('/schools/{school}/parents', [ParentController::class, 'index']);
        Route::get('/schools/{school}/parents/{parent}/children', [ParentController::class, 'children']);
        Route::get('/schools/{school}/my-children', [ParentController::class, 'mine']);
        Route::get('/schools/{school}/classes/{schoolClass}/timetable', [TimetableController::class, 'index']);
        Route::get('/schools/{school}/my-assignments', [AssignmentController::class, 'mine']);
        Route::get('/schools/{school}/my-timetable', [TimetableController::class, 'mine']);
        Route::get('/schools/{school}/students/{student}/bulletin', [BulletinController::class, 'show']);
        Route::get('/schools/{school}/payment-methods', [PaymentMethodController::class, 'index']);
        Route::get('/schools/{school}/fee-structures', [FeeStructureController::class, 'index']);
        Route::get('/schools/{school}/payments', [PaymentController::class, 'index']);
        Route::get('/schools/{school}/students/{student}/payments', [PaymentController::class, 'forStudent']);
        Route::get('/schools/{school}/students/{student}/attendances', [AttendanceController::class, 'forStudent']);
        Route::get('/schools/{school}/attendances/pending-justifications', [AttendanceController::class, 'pendingJustifications']);

        // Toute création/modification/suppression de données d'école exige
        // un email vérifié.
        Route::middleware('verified')->group(function () {
            Route::put('/schools/{school}/settings', [SchoolController::class, 'update']);

            Route::post('/schools/{school}/events', [EventController::class, 'store']);
            Route::delete('/schools/{school}/events/{event}', [EventController::class, 'destroy']);

            Route::post('/schools/{school}/enrollment-requests/{enrollmentRequest}/accept', [EnrollmentRequestController::class, 'accept']);
            Route::post('/schools/{school}/enrollment-requests/{enrollmentRequest}/reject', [EnrollmentRequestController::class, 'reject']);

            Route::post('/schools/{school}/members', [SchoolMemberController::class, 'store']);
            Route::post('/schools/{school}/teachers', [TeacherController::class, 'store']);

            Route::post('/schools/{school}/classes', [ClassController::class, 'store']);
            Route::post('/schools/{school}/classes/{schoolClass}/teachers', [ClassTeacherController::class, 'store']);
            Route::delete('/schools/{school}/classes/{schoolClass}/teachers/{assignment}', [ClassTeacherController::class, 'destroy']);

            Route::post('/schools/{school}/students', [StudentController::class, 'store']);

            Route::post('/schools/{school}/classes/{schoolClass}/timetable', [TimetableController::class, 'store']);
            Route::delete('/schools/{school}/classes/{schoolClass}/timetable/{slot}', [TimetableController::class, 'destroy']);

            Route::post('/schools/{school}/payment-methods', [PaymentMethodController::class, 'store']);
            Route::put('/schools/{school}/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update']);
            Route::delete('/schools/{school}/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'destroy']);

            Route::post('/schools/{school}/fee-structures', [FeeStructureController::class, 'store']);
            Route::delete('/schools/{school}/fee-structures/{feeStructure}', [FeeStructureController::class, 'destroy']);

            Route::post('/schools/{school}/students/{student}/payments', [PaymentController::class, 'store']);
            Route::post('/schools/{school}/payments/{payment}/confirm', [PaymentController::class, 'confirm']);
            Route::post('/schools/{school}/payments/{payment}/reject', [PaymentController::class, 'reject']);

            Route::post('/schools/{school}/attendances/{attendance}/justify', [AttendanceController::class, 'justify']);
            Route::post('/schools/{school}/attendances/{attendance}/approve-justification', [AttendanceController::class, 'approveJustification']);
            Route::post('/schools/{school}/attendances/{attendance}/reject-justification', [AttendanceController::class, 'rejectJustification']);
        });
    });
});
