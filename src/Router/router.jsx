import { createBrowserRouter, Navigate } from "react-router-dom";
import Login from "../Auth/Login";
import Signup from "../Auth/Signup";
import ValidateResetCode from "../Auth/ValidateResetCode";

import SaveRoute from "../Auth/SaveRoute";
import AdminLayout from "../Layout/AdminLayout";
import Home from "../pages/Home/Home";
import Loading from "../components/Loading";
import Exams from "../pages/Exams/Exams";
import Profile from "../pages/Profile/Profile";
import Payment from '../pages/Payment/Payment'
import Wallet from '../pages/Wallet/Wallet'
import ForgetPassword from "../Auth/ForgetPassword";
import ResetPassword from "../Auth/ResetPassword";
import ResendVerificationEmail from "../Auth/ResendVerificationEmail";
import Message from "../Auth/Message";

import History from "../pages/Attent/History";
import Upcoming from '../pages/Attent/Upcoming'
import Diagnostic from "../pages/Exams/Diagnostic";
import ActiveExam from "../pages/Exams/ActiveExam";
import Review from "../pages/Exams/Review";
import MyCourses from "../pages/MyCourses/MyCourses";
import OneCourses from "../pages/MyCourses/OneCourses";
import Lesson  from "../pages/Lesson/lesson";
import Chapters from "../pages/Chapters/Chapters";
import OneChapter from "../pages/Chapters/OneChapter";
import Enrollment from "../pages/Enrollment/Enrollment";
const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/message",
    element: <Message />,
  },
  {
    path: "/validateResetCode",
    element: <ValidateResetCode />,
  },
  {
    path: "/resendverificationemail",
    element: <ResendVerificationEmail />,
  },
  {
    path: "/forgetpassword",
    element: <ForgetPassword />,
  },
  {
    path: "/resetpassword",
    element: <ResetPassword />,
  },
  {
    path: "/user",
    element: (
      <SaveRoute>
        <AdminLayout />
      </SaveRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="home" replace />,
      },
      {
        path: "home",
        element: <Home />,
      },
      {
        path: "loading",
        element: <Loading />,
      },
      {
        path: "exams",
        element: <Exams />,
      },
      {
        path: "diagnostic",
        element: <Diagnostic />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "payment",
        element: <Payment />,
      },
      {
        path: "upcoming",
        element: <Upcoming />,
      },
      {
        path: "activeexam/:id",
        element: <ActiveExam />,
      },
      {
        path: "review/:attemptId",
        element: <Review />,
      },
      {
        path: "wallet",
        element: <Wallet />,
      },
      {
        path: "history",
        element: <History />,
      },
      {
        path: "mycourses",
        element: <MyCourses />,
      },
      {
        path: "courses/:id",
        element: <OneCourses />,
      },
      {
        path: "lesson/:id",
        element: <Lesson />,
      },
      {
        path: "chapters/:id",
        element: <Chapters />,
      },
      {
        path: "chapter/:id",
        element: <OneChapter />,
      },
      {
        path: "enrollment",
        element: <Enrollment />,
      },
    ],
  },
]);

export default router;