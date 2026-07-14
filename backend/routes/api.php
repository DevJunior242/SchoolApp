<?php

use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BulletinController;
use App\Http\Controllers\Api\ClassController;
use App\Http\Controllers\Api\ClassTeacherController;
use App\Http\Controllers\Api\CountryController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\LevelController;
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

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::get('/schools', [SchoolController::class, 'index']);
Route::get('/roles', [RoleController::class, 'index']);
Route::get('/countries', [CountryController::class, 'index']);
Route::get('/levels', [LevelController::class, 'index']);
Route::get('/subjects', [SubjectController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/my-schools', [SchoolController::class, 'mine']);
    Route::post('/schools', [SchoolController::class, 'store']);
    Route::post('/schools/{school}/join', [SchoolController::class, 'join']);
    Route::post('/schools/{school}/switch', [SchoolController::class, 'switchTo']);

    Route::get('/schools/{school}/members', [SchoolMemberController::class, 'index']);
    Route::post('/schools/{school}/members', [SchoolMemberController::class, 'store']);

    Route::get('/schools/{school}/teachers', [TeacherController::class, 'index']);
    Route::post('/schools/{school}/teachers', [TeacherController::class, 'store']);

    Route::get('/schools/{school}/classes', [ClassController::class, 'index']);
    Route::post('/schools/{school}/classes', [ClassController::class, 'store']);
    Route::post('/schools/{school}/classes/{schoolClass}/teachers', [ClassTeacherController::class, 'store']);
    Route::delete('/schools/{school}/classes/{schoolClass}/teachers/{assignment}', [ClassTeacherController::class, 'destroy']);

    Route::get('/schools/{school}/students', [StudentController::class, 'index']);
    Route::post('/schools/{school}/students', [StudentController::class, 'store']);

    Route::get('/schools/{school}/parents', [ParentController::class, 'index']);
    Route::get('/schools/{school}/parents/{parent}/children', [ParentController::class, 'children']);
    Route::get('/schools/{school}/my-children', [ParentController::class, 'mine']);

    Route::get('/schools/{school}/classes/{schoolClass}/timetable', [TimetableController::class, 'index']);
    Route::post('/schools/{school}/classes/{schoolClass}/timetable', [TimetableController::class, 'store']);
    Route::delete('/schools/{school}/classes/{schoolClass}/timetable/{slot}', [TimetableController::class, 'destroy']);

    Route::get('/schools/{school}/my-assignments', [AssignmentController::class, 'mine']);
    Route::get('/schools/{school}/students/{student}/bulletin', [BulletinController::class, 'show']);

    Route::get('/assignments/{assignment}/students', [GradeController::class, 'students']);
    Route::get('/assignments/{assignment}/grades', [GradeController::class, 'index']);
    Route::post('/assignments/{assignment}/grades', [GradeController::class, 'store']);
    Route::delete('/assignments/{assignment}/grades/{grade}', [GradeController::class, 'destroy']);

    Route::get('/schools/{school}/payment-methods', [PaymentMethodController::class, 'index']);
    Route::post('/schools/{school}/payment-methods', [PaymentMethodController::class, 'store']);
    Route::put('/schools/{school}/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update']);
    Route::delete('/schools/{school}/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'destroy']);

    Route::get('/schools/{school}/fee-structures', [FeeStructureController::class, 'index']);
    Route::post('/schools/{school}/fee-structures', [FeeStructureController::class, 'store']);
    Route::delete('/schools/{school}/fee-structures/{feeStructure}', [FeeStructureController::class, 'destroy']);

    Route::get('/schools/{school}/payments', [PaymentController::class, 'index']);
    Route::get('/schools/{school}/students/{student}/payments', [PaymentController::class, 'forStudent']);
    Route::post('/schools/{school}/students/{student}/payments', [PaymentController::class, 'store']);
    Route::post('/schools/{school}/payments/{payment}/confirm', [PaymentController::class, 'confirm']);
    Route::post('/schools/{school}/payments/{payment}/reject', [PaymentController::class, 'reject']);
});
