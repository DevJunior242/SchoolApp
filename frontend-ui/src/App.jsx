import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import GuestRoute from "./components/GuestRoute.jsx";

const PublicLayout = lazy(() => import("./layouts/PublicLayout.jsx"));
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout.jsx"));
const SuperAdminActivationKeysPage = lazy(() => import("./pages/SuperAdminActivationKeysPage.jsx"));
const SuperAdminSchoolsPage = lazy(() => import("./pages/SuperAdminSchoolsPage.jsx"));
const SuperAdminSchoolPricingPlansPage = lazy(() => import("./pages/SuperAdminSchoolPricingPlansPage.jsx"));
const SuperAdminSchoolSubscriptionsPage = lazy(() => import("./pages/SuperAdminSchoolSubscriptionsPage.jsx"));
const SuperAdminDemoRequestsPage = lazy(() => import("./pages/SuperAdminDemoRequestsPage.jsx"));
const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const CreateSchoolPage = lazy(() => import("./pages/CreateSchoolPage.jsx"));
const PricingPage = lazy(() => import("./pages/PricingPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.jsx"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage.jsx"));
const DashboardOverviewPage = lazy(() => import("./pages/DashboardOverviewPage.jsx"));
const DashboardSchoolsPage = lazy(() => import("./pages/DashboardSchoolsPage.jsx"));
const DashboardMembersPage = lazy(() => import("./pages/DashboardMembersPage.jsx"));
const DashboardTeachersPage = lazy(() => import("./pages/DashboardTeachersPage.jsx"));
const DashboardHrPage = lazy(() => import("./pages/DashboardHrPage.jsx"));
const DashboardClassesPage = lazy(() => import("./pages/DashboardClassesPage.jsx"));
const DashboardStudentsPage = lazy(() => import("./pages/DashboardStudentsPage.jsx"));
const DashboardTimetablePage = lazy(() => import("./pages/DashboardTimetablePage.jsx"));
const TeacherAssignmentsPage = lazy(() => import("./pages/TeacherAssignmentsPage.jsx"));
const GradeEntryPage = lazy(() => import("./pages/GradeEntryPage.jsx"));
const BulletinPage = lazy(() => import("./pages/BulletinPage.jsx"));
const DashboardParentsPage = lazy(() => import("./pages/DashboardParentsPage.jsx"));
const DashboardPaymentsPage = lazy(() => import("./pages/DashboardPaymentsPage.jsx"));
const DashboardExpensesPage = lazy(() => import("./pages/DashboardExpensesPage.jsx"));
const DashboardTreasuryPage = lazy(() => import("./pages/DashboardTreasuryPage.jsx"));
const DashboardAccountingPage = lazy(() => import("./pages/DashboardAccountingPage.jsx"));
const ParentPaymentsPage = lazy(() => import("./pages/ParentPaymentsPage.jsx"));
const AttendanceEntryPage = lazy(() => import("./pages/AttendanceEntryPage.jsx"));
const ParentAttendancePage = lazy(() => import("./pages/ParentAttendancePage.jsx"));
const ParentBulletinsPage = lazy(() => import("./pages/ParentBulletinsPage.jsx"));
const AttendanceJustificationsPage = lazy(() => import("./pages/AttendanceJustificationsPage.jsx"));
const TeacherTimetablePage = lazy(() => import("./pages/TeacherTimetablePage.jsx"));
const DashboardEventsPage = lazy(() => import("./pages/DashboardEventsPage.jsx"));
const DashboardEnrollmentRequestsPage = lazy(() => import("./pages/DashboardEnrollmentRequestsPage.jsx"));
const DashboardSettingsPage = lazy(() => import("./pages/DashboardSettingsPage.jsx"));
const AccountSecurityPage = lazy(() => import("./pages/AccountSecurityPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const DashboardSchoolYearPage = lazy(() => import("./pages/DashboardSchoolYearPage.jsx"));
const DashboardMessagesPage = lazy(() => import("./pages/DashboardMessagesPage.jsx"));
const EventRecapPage = lazy(() => import("./pages/EventRecapPage.jsx"));
const StudentHealthPage = lazy(() => import("./pages/StudentHealthPage.jsx"));
const HealthDashboardPage = lazy(() => import("./pages/HealthDashboardPage.jsx"));
const StudentWalletPage = lazy(() => import("./pages/StudentWalletPage.jsx"));
const StudentQrBadgePage = lazy(() => import("./pages/StudentQrBadgePage.jsx"));
const DashboardCafeteriaPage = lazy(() => import("./pages/DashboardCafeteriaPage.jsx"));
const ParentCafeteriaPage = lazy(() => import("./pages/ParentCafeteriaPage.jsx"));
const StudentSelfBadgePage = lazy(() => import("./pages/StudentSelfBadgePage.jsx"));
const StudentSelfWalletPage = lazy(() => import("./pages/StudentSelfWalletPage.jsx"));
const StudentSelfBulletinPage = lazy(() => import("./pages/StudentSelfBulletinPage.jsx"));
const DashboardBusesPage = lazy(() => import("./pages/DashboardBusesPage.jsx"));
const BusDriverTripPage = lazy(() => import("./pages/BusDriverTripPage.jsx"));
const ParentBusTrackingPage = lazy(() => import("./pages/ParentBusTrackingPage.jsx"));
const DashboardLibraryPage = lazy(() => import("./pages/DashboardLibraryPage.jsx"));
const MyLibraryPage = lazy(() => import("./pages/MyLibraryPage.jsx"));
const ParentLibraryPage = lazy(() => import("./pages/ParentLibraryPage.jsx"));
const AssignmentCourseContentPage = lazy(() => import("./pages/AssignmentCourseContentPage.jsx"));
const MyCoursesPage = lazy(() => import("./pages/MyCoursesPage.jsx"));
const ParentCoursesPage = lazy(() => import("./pages/ParentCoursesPage.jsx"));
const DashboardMarketplacePage = lazy(() => import("./pages/DashboardMarketplacePage.jsx"));
const SuperAdminMarketplacePage = lazy(() => import("./pages/SuperAdminMarketplacePage.jsx"));
const ProviderItemsPage = lazy(() => import("./pages/ProviderItemsPage.jsx"));
const BecomeProviderPage = lazy(() => import("./pages/BecomeProviderPage.jsx"));
const DashboardAiAssistantPage = lazy(() => import("./pages/DashboardAiAssistantPage.jsx"));
const ParentAiAssistantPage = lazy(() => import("./pages/ParentAiAssistantPage.jsx"));
const TermsPage = lazy(() => import("./pages/TermsPage.jsx"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.jsx"));

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "45vh",
        display: "grid",
        placeItems: "center",
        color: "inherit",
      }}
      aria-busy="true"
      aria-live="polite"
    >
      Chargement...
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/create-school" element={<CreateSchoolPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />

          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/devenir-prestataire" element={<BecomeProviderPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverviewPage />} />
          <Route path="schools" element={<DashboardSchoolsPage />} />
          <Route path="members" element={<DashboardMembersPage />} />
          <Route path="teachers" element={<DashboardTeachersPage />} />
          <Route path="hr" element={<DashboardHrPage />} />
          <Route path="classes" element={<DashboardClassesPage />} />
          <Route path="students" element={<DashboardStudentsPage />} />
          <Route
            path="classes/:classId/timetable"
            element={<DashboardTimetablePage />}
          />
          <Route path="my-assignments" element={<TeacherAssignmentsPage />} />
          <Route
            path="assignments/:assignmentId/grades"
            element={<GradeEntryPage />}
          />
          <Route path="students/:studentId/bulletin" element={<BulletinPage />} />
          <Route
            path="students/:studentId/health"
            element={<StudentHealthPage />}
          />
          <Route
            path="students/:studentId/wallet"
            element={<StudentWalletPage />}
          />
          <Route
            path="students/:studentId/qr-badge"
            element={<StudentQrBadgePage />}
          />
          <Route path="my-children-cafeteria" element={<ParentCafeteriaPage />} />
          <Route path="my-badge" element={<StudentSelfBadgePage />} />
          <Route path="my-wallet" element={<StudentSelfWalletPage />} />
          <Route path="my-bulletin" element={<StudentSelfBulletinPage />} />
          <Route path="buses" element={<DashboardBusesPage />} />
          <Route path="my-bus-trip" element={<BusDriverTripPage />} />
          <Route path="my-children-bus" element={<ParentBusTrackingPage />} />
          <Route path="library" element={<DashboardLibraryPage />} />
          <Route path="my-library" element={<MyLibraryPage />} />
          <Route path="my-children-library" element={<ParentLibraryPage />} />
          <Route
            path="assignments/:assignmentId/course-contents"
            element={<AssignmentCourseContentPage />}
          />
          <Route path="my-courses" element={<MyCoursesPage />} />
          <Route path="my-children-courses" element={<ParentCoursesPage />} />
          <Route path="marketplace" element={<DashboardMarketplacePage />} />
          <Route
            path="marketplace-moderation"
            element={<SuperAdminMarketplacePage />}
          />
          <Route path="my-marketplace-items" element={<ProviderItemsPage />} />
          <Route path="ai-assistant" element={<DashboardAiAssistantPage />} />
          <Route
            path="my-children-ai-assistant"
            element={<ParentAiAssistantPage />}
          />
          <Route path="cafeteria" element={<DashboardCafeteriaPage />} />
          <Route path="health" element={<HealthDashboardPage />} />
          <Route path="parents" element={<DashboardParentsPage />} />
          <Route path="payments" element={<DashboardPaymentsPage />} />
          <Route path="expenses" element={<DashboardExpensesPage />} />
          <Route path="treasury" element={<DashboardTreasuryPage />} />
          <Route path="accounting" element={<DashboardAccountingPage />} />
          <Route path="my-children-payments" element={<ParentPaymentsPage />} />
          <Route
            path="assignments/:assignmentId/attendances"
            element={<AttendanceEntryPage />}
          />
          <Route
            path="my-children-attendances"
            element={<ParentAttendancePage />}
          />
          <Route path="my-children-bulletins" element={<ParentBulletinsPage />} />
          <Route
            path="attendance-justifications"
            element={<AttendanceJustificationsPage />}
          />
          <Route path="my-timetable" element={<TeacherTimetablePage />} />
          <Route path="events" element={<DashboardEventsPage />} />
          <Route path="events/:eventId/recap" element={<EventRecapPage />} />
          <Route
            path="enrollment-requests"
            element={<DashboardEnrollmentRequestsPage />}
          />
          <Route path="settings" element={<DashboardSettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="security" element={<AccountSecurityPage />} />
          <Route path="school-year" element={<DashboardSchoolYearPage />} />
          <Route path="messages" element={<DashboardMessagesPage />} />
          <Route
            path="activation-keys"
            element={<SuperAdminActivationKeysPage />}
          />
          <Route path="all-schools" element={<SuperAdminSchoolsPage />} />
          <Route
            path="school-pricing-plans"
            element={<SuperAdminSchoolPricingPlansPage />}
          />
          <Route
            path="school-subscriptions"
            element={<SuperAdminSchoolSubscriptionsPage />}
          />
          <Route path="demo-requests" element={<SuperAdminDemoRequestsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
