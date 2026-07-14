import { Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
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
import ParentPaymentsPage from './pages/ParentPaymentsPage.jsx';

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route path="parents" element={<DashboardParentsPage />} />
        <Route path="payments" element={<DashboardPaymentsPage />} />
        <Route path="my-children-payments" element={<ParentPaymentsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
