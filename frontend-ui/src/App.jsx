import { Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SuperAdminActivationKeysPage from './pages/SuperAdminActivationKeysPage.jsx';
import SuperAdminSchoolsPage from './pages/SuperAdminSchoolsPage.jsx';
import HomePage from './pages/HomePage.jsx';
import CreateSchoolPage from './pages/CreateSchoolPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import DashboardOverviewPage from './pages/DashboardOverviewPage.jsx';
import DashboardSchoolsPage from './pages/DashboardSchoolsPage.jsx';
import DashboardMembersPage from './pages/DashboardMembersPage.jsx';
import DashboardTeachersPage from './pages/DashboardTeachersPage.jsx';
import DashboardClassesPage from './pages/DashboardClassesPage.jsx';
import DashboardStudentsPage from './pages/DashboardStudentsPage.jsx';
import DashboardTimetablePage from './pages/DashboardTimetablePage.jsx';
import TeacherAssignmentsPage from './pages/TeacherAssignmentsPage.jsx';
import GradeEntryPage from './pages/GradeEntryPage.jsx';
import BulletinPage from './pages/BulletinPage.jsx';
import DashboardParentsPage from './pages/DashboardParentsPage.jsx';
import DashboardPaymentsPage from './pages/DashboardPaymentsPage.jsx';
import DashboardExpensesPage from './pages/DashboardExpensesPage.jsx';
import DashboardTreasuryPage from './pages/DashboardTreasuryPage.jsx';
import DashboardAccountingPage from './pages/DashboardAccountingPage.jsx';
import ParentPaymentsPage from './pages/ParentPaymentsPage.jsx';
import AttendanceEntryPage from './pages/AttendanceEntryPage.jsx';
import ParentAttendancePage from './pages/ParentAttendancePage.jsx';
import ParentBulletinsPage from './pages/ParentBulletinsPage.jsx';
import AttendanceJustificationsPage from './pages/AttendanceJustificationsPage.jsx';
import TeacherTimetablePage from './pages/TeacherTimetablePage.jsx';
import DashboardEventsPage from './pages/DashboardEventsPage.jsx';
import DashboardEnrollmentRequestsPage from './pages/DashboardEnrollmentRequestsPage.jsx';
import DashboardSettingsPage from './pages/DashboardSettingsPage.jsx';
import AccountSecurityPage from './pages/AccountSecurityPage.jsx';
import DashboardSchoolYearPage from './pages/DashboardSchoolYearPage.jsx';
import DashboardMessagesPage from './pages/DashboardMessagesPage.jsx';
import EventRecapPage from './pages/EventRecapPage.jsx';
import StudentHealthPage from './pages/StudentHealthPage.jsx';
import HealthDashboardPage from './pages/HealthDashboardPage.jsx';
import StudentWalletPage from './pages/StudentWalletPage.jsx';
import StudentQrBadgePage from './pages/StudentQrBadgePage.jsx';
import DashboardCafeteriaPage from './pages/DashboardCafeteriaPage.jsx';
import ParentCafeteriaPage from './pages/ParentCafeteriaPage.jsx';
import StudentSelfBadgePage from './pages/StudentSelfBadgePage.jsx';
import StudentSelfWalletPage from './pages/StudentSelfWalletPage.jsx';
import StudentSelfBulletinPage from './pages/StudentSelfBulletinPage.jsx';
import DashboardBusesPage from './pages/DashboardBusesPage.jsx';
import BusDriverTripPage from './pages/BusDriverTripPage.jsx';
import ParentBusTrackingPage from './pages/ParentBusTrackingPage.jsx';
import DashboardLibraryPage from './pages/DashboardLibraryPage.jsx';
import MyLibraryPage from './pages/MyLibraryPage.jsx';
import ParentLibraryPage from './pages/ParentLibraryPage.jsx';
import AssignmentCourseContentPage from './pages/AssignmentCourseContentPage.jsx';
import MyCoursesPage from './pages/MyCoursesPage.jsx';
import ParentCoursesPage from './pages/ParentCoursesPage.jsx';
import DashboardMarketplacePage from './pages/DashboardMarketplacePage.jsx';
import SuperAdminMarketplacePage from './pages/SuperAdminMarketplacePage.jsx';
import ProviderItemsPage from './pages/ProviderItemsPage.jsx';
import BecomeProviderPage from './pages/BecomeProviderPage.jsx';
import DashboardAiAssistantPage from './pages/DashboardAiAssistantPage.jsx';
import ParentAiAssistantPage from './pages/ParentAiAssistantPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/create-school" element={<CreateSchoolPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
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
        <Route path="classes" element={<DashboardClassesPage />} />
        <Route path="students" element={<DashboardStudentsPage />} />
        <Route path="classes/:classId/timetable" element={<DashboardTimetablePage />} />
        <Route path="my-assignments" element={<TeacherAssignmentsPage />} />
        <Route path="assignments/:assignmentId/grades" element={<GradeEntryPage />} />
        <Route path="students/:studentId/bulletin" element={<BulletinPage />} />
        <Route path="students/:studentId/health" element={<StudentHealthPage />} />
        <Route path="students/:studentId/wallet" element={<StudentWalletPage />} />
        <Route path="students/:studentId/qr-badge" element={<StudentQrBadgePage />} />
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
        <Route path="assignments/:assignmentId/course-contents" element={<AssignmentCourseContentPage />} />
        <Route path="my-courses" element={<MyCoursesPage />} />
        <Route path="my-children-courses" element={<ParentCoursesPage />} />
        <Route path="marketplace" element={<DashboardMarketplacePage />} />
        <Route path="marketplace-moderation" element={<SuperAdminMarketplacePage />} />
        <Route path="my-marketplace-items" element={<ProviderItemsPage />} />
        <Route path="ai-assistant" element={<DashboardAiAssistantPage />} />
        <Route path="my-children-ai-assistant" element={<ParentAiAssistantPage />} />
        <Route path="cafeteria" element={<DashboardCafeteriaPage />} />
        <Route path="health" element={<HealthDashboardPage />} />
        <Route path="parents" element={<DashboardParentsPage />} />
        <Route path="payments" element={<DashboardPaymentsPage />} />
        <Route path="expenses" element={<DashboardExpensesPage />} />
        <Route path="treasury" element={<DashboardTreasuryPage />} />
        <Route path="accounting" element={<DashboardAccountingPage />} />
        <Route path="my-children-payments" element={<ParentPaymentsPage />} />
        <Route path="assignments/:assignmentId/attendances" element={<AttendanceEntryPage />} />
        <Route path="my-children-attendances" element={<ParentAttendancePage />} />
        <Route path="my-children-bulletins" element={<ParentBulletinsPage />} />
        <Route path="attendance-justifications" element={<AttendanceJustificationsPage />} />
        <Route path="my-timetable" element={<TeacherTimetablePage />} />
        <Route path="events" element={<DashboardEventsPage />} />
        <Route path="events/:eventId/recap" element={<EventRecapPage />} />
        <Route path="enrollment-requests" element={<DashboardEnrollmentRequestsPage />} />
        <Route path="settings" element={<DashboardSettingsPage />} />
        <Route path="security" element={<AccountSecurityPage />} />
        <Route path="school-year" element={<DashboardSchoolYearPage />} />
        <Route path="messages" element={<DashboardMessagesPage />} />
        <Route path="activation-keys" element={<SuperAdminActivationKeysPage />} />
        <Route path="all-schools" element={<SuperAdminSchoolsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
