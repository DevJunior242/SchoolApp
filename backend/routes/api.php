<?php

use App\Http\Controllers\Api\ActivationKeyController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AiAssistantController;
use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookController;
use App\Http\Controllers\Api\BookCopyController;
use App\Http\Controllers\Api\BookDocumentController;
use App\Http\Controllers\Api\BookLoanController;
use App\Http\Controllers\Api\BookReservationController;
use App\Http\Controllers\Api\BulletinController;
use App\Http\Controllers\Api\BusController;
use App\Http\Controllers\Api\BusStopController;
use App\Http\Controllers\Api\BusTripController;
use App\Http\Controllers\Api\CafeteriaMealServiceController;
use App\Http\Controllers\Api\CafeteriaMenuController;
use App\Http\Controllers\Api\ClassController;
use App\Http\Controllers\Api\ClassTeacherController;
use App\Http\Controllers\Api\CountryController;
use App\Http\Controllers\Api\CourseContentController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EnrollmentRequestController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\EventRecapController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\MarketplacePlanController;
use App\Http\Controllers\Api\HealthDashboardController;
use App\Http\Controllers\Api\LevelController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\FeeStructureController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PaymentMethodController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SchoolController;
use App\Http\Controllers\Api\SchoolMemberController;
use App\Http\Controllers\Api\SeasonController;
use App\Http\Controllers\Api\ServiceProviderController;
use App\Http\Controllers\Api\ServiceProviderItemController;
use App\Http\Controllers\Api\SchoolYearController;
use App\Http\Controllers\Api\StudentAllergyController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentHealthDocumentController;
use App\Http\Controllers\Api\StudentHealthProfileController;
use App\Http\Controllers\Api\StudentMedicalVisitController;
use App\Http\Controllers\Api\StudentMedicationController;
use App\Http\Controllers\Api\StudentVaccinationController;
use App\Http\Controllers\Api\StudentWalletController;
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

// Formules et moyens de paiement affichés avant inscription/paiement :
// public, pas de donnée sensible.
Route::get('/marketplace/plans', [MarketplacePlanController::class, 'index']);
Route::get('/marketplace/payment-methods', [PaymentMethodController::class, 'platformIndex']);

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

        Route::post('/marketplace/providers', [ServiceProviderController::class, 'store']);
        Route::put('/marketplace/my-provider', [ServiceProviderController::class, 'updateProfile']);
        Route::post('/marketplace/my-provider/payments', [ServiceProviderController::class, 'reportPayment']);
        Route::post('/marketplace/my-provider/items', [ServiceProviderItemController::class, 'store']);
        Route::put('/marketplace/items/{item}', [ServiceProviderItemController::class, 'update']);
        Route::delete('/marketplace/items/{item}', [ServiceProviderItemController::class, 'destroy']);
    });

    // Consultation de sa propre fiche prestataire : pas besoin d'un email
    // vérifié pour simplement voir où on en est.
    Route::get('/marketplace/my-provider', [ServiceProviderController::class, 'myProfile']);

    Route::middleware('super.admin')->group(function () {
        Route::get('/admin/activation-keys', [ActivationKeyController::class, 'index']);
        Route::post('/admin/activation-keys', [ActivationKeyController::class, 'generate']);

        Route::get('/admin/stats', [AdminController::class, 'stats']);
        Route::get('/admin/schools', [AdminController::class, 'schools']);
        Route::post('/admin/schools/{school}/toggle-status', [AdminController::class, 'toggleSchoolStatus']);

        Route::get('/admin/marketplace/providers', [ServiceProviderController::class, 'adminIndex']);
        Route::post('/admin/marketplace/providers/{provider}/approve', [ServiceProviderController::class, 'approve']);
        Route::post('/admin/marketplace/providers/{provider}/reject', [ServiceProviderController::class, 'reject']);

        Route::get('/admin/marketplace/payments', [ServiceProviderController::class, 'adminPaymentsIndex']);
        Route::post('/admin/marketplace/payments/{payment}/confirm', [ServiceProviderController::class, 'confirmPayment']);
        Route::post('/admin/marketplace/payments/{payment}/reject', [ServiceProviderController::class, 'rejectPayment']);

        Route::get('/admin/marketplace/plans', [MarketplacePlanController::class, 'adminIndex']);
        Route::post('/admin/marketplace/plans', [MarketplacePlanController::class, 'adminStore']);
        Route::put('/admin/marketplace/plans/{plan}', [MarketplacePlanController::class, 'adminUpdate']);
        Route::delete('/admin/marketplace/plans/{plan}', [MarketplacePlanController::class, 'adminDestroy']);

        Route::get('/admin/marketplace/payment-methods', [PaymentMethodController::class, 'adminIndex']);
        Route::post('/admin/marketplace/payment-methods', [PaymentMethodController::class, 'adminStore']);
        Route::put('/admin/marketplace/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'adminUpdate']);
        Route::delete('/admin/marketplace/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'adminDestroy']);
    });

    Route::get('/assignments/{assignment}', [AssignmentController::class, 'show']);
    Route::get('/assignments/{assignment}/students', [GradeController::class, 'students']);
    Route::get('/assignments/{assignment}/grades', [GradeController::class, 'index']);
    Route::get('/assignments/{assignment}/attendances', [AttendanceController::class, 'index']);
    Route::get('/assignments/{assignment}/course-contents', [CourseContentController::class, 'index']);
    Route::get('/course-contents/{content}/download', [CourseContentController::class, 'download']);
    Route::get('/course-contents/{content}/correction/download', [CourseContentController::class, 'downloadCorrection']);

    Route::middleware('verified')->group(function () {
        Route::post('/assignments/{assignment}/grades', [GradeController::class, 'store']);
        Route::delete('/assignments/{assignment}/grades/{grade}', [GradeController::class, 'destroy']);
        Route::post('/assignments/{assignment}/attendances', [AttendanceController::class, 'store']);
        Route::post('/assignments/{assignment}/course-contents', [CourseContentController::class, 'store']);
        Route::post('/course-contents/{content}/correction', [CourseContentController::class, 'storeCorrection']);
        Route::delete('/course-contents/{content}', [CourseContentController::class, 'destroy']);
    });

    // Toutes les routes ci-dessous portent sur une école précise ({school})
    // : ce middleware vérifie que l'utilisateur en est bien membre actif
    // avant de laisser passer, en plus des contrôles de rôle par action.
    Route::middleware('school.member')->group(function () {
        // Changer d'école active n'écrit aucune donnée métier : exempté de
        // la vérification d'email pour ne pas casser la navigation de base.
        Route::post('/schools/{school}/switch', [SchoolController::class, 'switchTo']);

        Route::get('/schools/{school}/settings', [SchoolController::class, 'show']);
        Route::get('/schools/{school}/seasons', [SeasonController::class, 'index']);
        Route::get('/schools/{school}/school-years', [SchoolYearController::class, 'index']);
        Route::get('/schools/{school}/dashboard-summary', [DashboardController::class, 'summary']);
        Route::get('/schools/{school}/events', [EventController::class, 'index']);
        Route::get('/schools/{school}/events/{event}/recap', [EventRecapController::class, 'show']);
        Route::get('/schools/{school}/enrollment-requests', [EnrollmentRequestController::class, 'index']);
        Route::get('/schools/{school}/members', [SchoolMemberController::class, 'index']);
        Route::get('/schools/{school}/teachers', [TeacherController::class, 'index']);
        Route::get('/schools/{school}/classes', [ClassController::class, 'index']);
        Route::get('/schools/{school}/students', [StudentController::class, 'index']);
        Route::get('/schools/{school}/parents', [ParentController::class, 'index']);
        Route::get('/schools/{school}/parents/{parent}/children', [ParentController::class, 'children']);
        Route::get('/schools/{school}/my-children', [ParentController::class, 'mine']);
        Route::get('/schools/{school}/my-student-profile', [StudentController::class, 'mine']);
        Route::get('/schools/{school}/classes/{schoolClass}/timetable', [TimetableController::class, 'index']);
        Route::get('/schools/{school}/my-assignments', [AssignmentController::class, 'mine']);
        Route::get('/schools/{school}/my-timetable', [TimetableController::class, 'mine']);
        Route::get('/schools/{school}/my-courses', [CourseContentController::class, 'myCourses']);
        Route::get('/schools/{school}/my-children-courses', [CourseContentController::class, 'forParentCourses']);
        Route::get('/schools/{school}/marketplace/providers', [ServiceProviderController::class, 'index']);
        Route::get('/schools/{school}/students/{student}/bulletin', [BulletinController::class, 'show']);
        Route::get('/schools/{school}/payment-methods', [PaymentMethodController::class, 'index']);
        Route::get('/schools/{school}/fee-structures', [FeeStructureController::class, 'index']);
        Route::get('/schools/{school}/payments', [PaymentController::class, 'index']);
        Route::get('/schools/{school}/students/{student}/payments', [PaymentController::class, 'forStudent']);
        Route::get('/schools/{school}/students/{student}/attendances', [AttendanceController::class, 'forStudent']);
        Route::get('/schools/{school}/attendances/pending-justifications', [AttendanceController::class, 'pendingJustifications']);
        Route::get('/schools/{school}/students/risk-report', [AiAssistantController::class, 'riskReport']);

        Route::get('/schools/{school}/messages/unread-count', [MessageController::class, 'unreadCount']);
        Route::get('/schools/{school}/messages', [MessageController::class, 'index']);
        Route::get('/schools/{school}/messages/inbox', [MessageController::class, 'inbox']);
        Route::get('/schools/{school}/messages/threads/{user}', [MessageController::class, 'thread']);

        Route::get('/schools/{school}/health/summary', [HealthDashboardController::class, 'summary']);
        Route::get('/schools/{school}/students/{student}/health/profile', [StudentHealthProfileController::class, 'show']);
        Route::get('/schools/{school}/students/{student}/health/allergies', [StudentAllergyController::class, 'index']);
        Route::get('/schools/{school}/students/{student}/health/vaccinations', [StudentVaccinationController::class, 'index']);
        Route::get('/schools/{school}/students/{student}/health/vaccinations/{vaccination}/document', [StudentVaccinationController::class, 'downloadDocument']);
        Route::get('/schools/{school}/students/{student}/health/visits', [StudentMedicalVisitController::class, 'index']);
        Route::get('/schools/{school}/students/{student}/health/medications', [StudentMedicationController::class, 'index']);
        Route::get('/schools/{school}/students/{student}/health/documents', [StudentHealthDocumentController::class, 'index']);
        Route::get('/schools/{school}/students/{student}/health/documents/{document}/download', [StudentHealthDocumentController::class, 'download']);

        Route::get('/schools/{school}/cafeteria/menu', [CafeteriaMenuController::class, 'show']);
        Route::get('/schools/{school}/cafeteria/wallet-transactions', [StudentWalletController::class, 'index']);
        Route::get('/schools/{school}/students/{student}/wallet', [StudentWalletController::class, 'show']);
        Route::get('/schools/{school}/students/{student}/cafeteria/lookup', [CafeteriaMealServiceController::class, 'lookup']);

        Route::get('/schools/{school}/buses', [BusController::class, 'index']);
        Route::get('/schools/{school}/buses/{bus}/trip', [BusTripController::class, 'show']);
        Route::get('/schools/{school}/my-children-bus', [BusTripController::class, 'mine']);

        Route::get('/schools/{school}/library/books', [BookController::class, 'index']);
        Route::get('/schools/{school}/library/books/{book}', [BookController::class, 'show']);
        Route::get('/schools/{school}/library/reservations', [BookReservationController::class, 'index']);
        Route::get('/schools/{school}/library/documents', [BookDocumentController::class, 'index']);
        Route::get('/schools/{school}/library/documents/{document}/download', [BookDocumentController::class, 'download']);
        Route::get('/schools/{school}/students/{student}/library/lookup', [BookLoanController::class, 'lookup']);
        Route::get('/schools/{school}/library/copies/{copy}/lookup', [BookLoanController::class, 'copyLookup']);
        Route::get('/schools/{school}/my-library', [BookLoanController::class, 'mine']);
        Route::get('/schools/{school}/my-children-library', [BookLoanController::class, 'forParent']);

        // Toute création/modification/suppression de données d'école exige
        // un email vérifié.
        Route::middleware('verified')->group(function () {
            Route::put('/schools/{school}/settings', [SchoolController::class, 'update']);
            Route::post('/schools/{school}/school-years', [SchoolYearController::class, 'store']);
            Route::put('/schools/{school}/seasons/{season}', [SeasonController::class, 'update']);

            Route::post('/schools/{school}/events', [EventController::class, 'store']);
            Route::delete('/schools/{school}/events/{event}', [EventController::class, 'destroy']);
            Route::post('/schools/{school}/events/{event}/recap', [EventRecapController::class, 'store']);
            Route::delete('/schools/{school}/events/{event}/recap/photos/{photo}', [EventRecapController::class, 'destroyPhoto']);

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

            Route::post('/schools/{school}/ai/ask', [AiAssistantController::class, 'ask']);

            Route::post('/schools/{school}/attendances/{attendance}/justify', [AttendanceController::class, 'justify']);
            Route::post('/schools/{school}/attendances/{attendance}/approve-justification', [AttendanceController::class, 'approveJustification']);
            Route::post('/schools/{school}/attendances/{attendance}/reject-justification', [AttendanceController::class, 'rejectJustification']);

            Route::put('/schools/{school}/students/{student}/health/profile', [StudentHealthProfileController::class, 'update']);

            Route::post('/schools/{school}/students/{student}/health/allergies', [StudentAllergyController::class, 'store']);
            Route::delete('/schools/{school}/students/{student}/health/allergies/{allergy}', [StudentAllergyController::class, 'destroy']);

            Route::post('/schools/{school}/students/{student}/health/vaccinations', [StudentVaccinationController::class, 'store']);
            Route::delete('/schools/{school}/students/{student}/health/vaccinations/{vaccination}', [StudentVaccinationController::class, 'destroy']);

            Route::post('/schools/{school}/students/{student}/health/visits', [StudentMedicalVisitController::class, 'store']);

            Route::post('/schools/{school}/students/{student}/health/medications', [StudentMedicationController::class, 'store']);
            Route::delete('/schools/{school}/students/{student}/health/medications/{medication}', [StudentMedicationController::class, 'destroy']);

            Route::post('/schools/{school}/students/{student}/health/documents', [StudentHealthDocumentController::class, 'store']);
            Route::delete('/schools/{school}/students/{student}/health/documents/{document}', [StudentHealthDocumentController::class, 'destroy']);

            Route::post('/schools/{school}/cafeteria/menu', [CafeteriaMenuController::class, 'store']);
            Route::post('/schools/{school}/students/{student}/cafeteria/serve', [CafeteriaMealServiceController::class, 'store']);

            Route::post('/schools/{school}/students/{student}/wallet/recharge', [StudentWalletController::class, 'requestRecharge']);
            Route::post('/schools/{school}/cafeteria/wallet-transactions/{walletTransaction}/confirm', [StudentWalletController::class, 'confirmRecharge']);
            Route::post('/schools/{school}/cafeteria/wallet-transactions/{walletTransaction}/reject', [StudentWalletController::class, 'rejectRecharge']);

            Route::post('/schools/{school}/buses', [BusController::class, 'store']);
            Route::put('/schools/{school}/buses/{bus}', [BusController::class, 'update']);
            Route::delete('/schools/{school}/buses/{bus}', [BusController::class, 'destroy']);
            Route::post('/schools/{school}/buses/{bus}/stops', [BusStopController::class, 'store']);
            Route::put('/schools/{school}/students/{student}/bus-stop', [StudentController::class, 'assignBusStop']);

            Route::post('/schools/{school}/buses/{bus}/trips/start', [BusTripController::class, 'start']);
            Route::post('/schools/{school}/bus-trips/{trip}/ping', [BusTripController::class, 'ping']);
            Route::post('/schools/{school}/bus-trips/{trip}/end', [BusTripController::class, 'end']);

            Route::post('/schools/{school}/library/books', [BookController::class, 'store']);
            Route::put('/schools/{school}/library/books/{book}', [BookController::class, 'update']);
            Route::delete('/schools/{school}/library/books/{book}', [BookController::class, 'destroy']);
            Route::post('/schools/{school}/library/books/{book}/copies', [BookCopyController::class, 'store']);
            Route::put('/schools/{school}/library/copies/{copy}', [BookCopyController::class, 'update']);
            Route::delete('/schools/{school}/library/copies/{copy}', [BookCopyController::class, 'destroy']);

            Route::post('/schools/{school}/students/{student}/library/loans', [BookLoanController::class, 'store']);
            Route::post('/schools/{school}/library/loans/{loan}/return', [BookLoanController::class, 'returnLoan']);
            Route::post('/schools/{school}/library/loans/{loan}/lost', [BookLoanController::class, 'markLost']);

            Route::post('/schools/{school}/students/{student}/library/reservations', [BookReservationController::class, 'store']);
            Route::post('/schools/{school}/library/reservations/{reservation}/cancel', [BookReservationController::class, 'cancel']);

            Route::post('/schools/{school}/library/documents', [BookDocumentController::class, 'store']);
            Route::delete('/schools/{school}/library/documents/{document}', [BookDocumentController::class, 'destroy']);

            Route::middleware('throttle:message-send')->group(function () {
                Route::post('/schools/{school}/messages', [MessageController::class, 'store']);
                Route::post('/schools/{school}/messages/threads/{user}', [MessageController::class, 'reply']);
            });
        });
    });
});
