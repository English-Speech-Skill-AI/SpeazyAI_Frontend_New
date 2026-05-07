import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

function RootRedirect() {
  const stored = (() => {
    try {
      const v = localStorage.getItem("speech-skills-locale")
      return v === "ar" ? "/ar" : "/en"
    } catch {
      return "/en"
    }
  })()
  return <Navigate to={stored} replace />
}
import { HomePage } from "./components/HomePage"
import { AboutPage } from "./components/AboutPage"
import { ContactPage } from "./components/ContactPage"
import { LoginPage } from "./components/LoginPage"
import { SignUpPage } from "./components/SignUpPage"
import { ForgotPasswordPage } from "./components/ForgotPasswordPage"
import { FamousSpeeches } from "./components/FamousSpeeches"
import { AcademicSamples } from "./components/AcademicSamples"
import { ChapterView } from "./components/ChapterView"
import { MyLessons } from "./components/MyLessons"
import { CustomContent } from "./components/CustomContent"
import { ChatWithAI } from "./components/ChatWithAI"
import { SpeechChatPage } from "./components/SpeechChatPage"
import { IELTSModule } from "./components/IELTSModule"
import { IELTSReadingPage } from "./components/ielts/IELTSReadingPage"
import { IELTSWritingPage } from "./components/ielts/IELTSWritingPage"
import { IELTSWritingTaskView } from "./components/ielts/IELTSWritingTaskView"
import { IELTSWritingResults } from "./components/ielts/IELTSWritingResults"
import { IELTSListeningResults } from "./components/ielts/IELTSListeningResults"
import { IELTSListeningTaskView } from "./components/ielts/IELTSListeningTaskView"
import { IELTSListeningPage } from "./components/ielts/IELTSListeningPage"
import { IELTSSpeakingPage } from "./components/ielts/IELTSSpeakingPage"
import { IELTSSpeakingTaskView } from "./components/ielts/IELTSSpeakingTaskView"
import { IELTSSpeakingResults } from "./components/ielts/IELTSSpeakingResults"
import { Profile } from "./components/Profile"
import { ThemeProvider } from "./components/ThemeProvider"
import { LocaleLayout, LocalizedNavigate } from "./components/LocaleLayout"
import { ContentLibrary } from "./components/ContentLibrary"
import { QuickPractice } from "./components/QuickPractice"
import { WritingPractice } from "./components/WritingPractice"
import { ListeningPractice } from "./components/ListeningPractice";
import { CasualConversations } from "./components/listening-practice/CasualConversations";
import { OfficialConversations } from "./components/listening-practice/OfficialConversations";
import { FormalConversations } from "./components/listening-practice/FormalConversations";
import { Connectteacher } from "./components/Connectteacher";
import { NewDashboard } from "./components/NewDashboard";
import { AzureSpeechTest } from "./components/AzureSpeechTest";
import { SkillDetail } from "./components/SkillDetail"
import ReadingPage from "./components/ReadingPage"
import { ReadingModulesPage } from "./components/modules/ReadingModulesPage"
import { SpeakingModulesPage } from "./components/modules/SpeakingModulesPage"
import { WritingModulesPage } from "./components/modules/WritingModulesPage"
import { ListeningModulesPage } from "./components/modules/ListeningModulesPage"
import { Stories } from "./components/Stories"
import { Novel } from "./components/Novel"
import { PhonemeGuide } from "./components/PhonemeGuide"
import { StoryDetail } from "./components/StoryDetail"
import { NovelDetail } from "./components/NovelDetail"
import { AssessmentResultsPage } from "./components/AssessmentResultsPage"
import { SpeechAssessmentResultsPage } from "./components/SpeechAssessmentResultsPage"
import { ReadingAssessmentResultsPage } from "./components/ReadingAssessmentResultsPage"
import { VideoContent } from "./components/VideoContent"
import { EduDashboard } from "./components/dashboard/EduDashboard"
import { ClassManagement } from "./components/dashboard/ClassManagement"
import { StudentDetailsPage } from "./components/dashboard/StudentdetailsPage"
import { LicenseManagement } from "./components/dashboard/LicenseManagement"
import { AuthProvider } from "./contexts/AuthContext"
import { Toaster } from "./components/ui/sonner"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { installErrorCapture } from "./utils/errorCapture"

export default function App() {
  useEffect(() => {
    const cleanup = installErrorCapture()
    return cleanup
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="size-full">
            <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/:locale" element={<LocaleLayout />}>
            {/* Public Routes */}
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignUpPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            
            {/* Protected Routes */}
            <Route path="quick-practice" element={<ProtectedRoute><QuickPractice /></ProtectedRoute>} />
            <Route path="application" element={<LocalizedNavigate to="/login" replace />} />
            <Route path="famous-speeches" element={<ProtectedRoute><FamousSpeeches /></ProtectedRoute>} />
            <Route path="famous-speeches/results" element={<ProtectedRoute><SpeechAssessmentResultsPage /></ProtectedRoute>} />
            <Route path="academic-samples" element={<ProtectedRoute><AcademicSamples /></ProtectedRoute>} />
            <Route path="academic-samples/chapter/:chapterId" element={<ProtectedRoute><ChapterView /></ProtectedRoute>} />
            <Route path="academic-samples/results" element={<ProtectedRoute><SpeechAssessmentResultsPage /></ProtectedRoute>} />
            <Route path="custom-content/results" element={<ProtectedRoute><SpeechAssessmentResultsPage /></ProtectedRoute>} />
            <Route path="my-lessons/results" element={<ProtectedRoute><SpeechAssessmentResultsPage /></ProtectedRoute>} />
            <Route path="my-lessons" element={<ProtectedRoute><MyLessons /></ProtectedRoute>} />
            <Route path="custom-content" element={<ProtectedRoute><CustomContent /></ProtectedRoute>} />
            <Route path="chat" element={<ProtectedRoute><ChatWithAI /></ProtectedRoute>} />
            <Route path="chat/conversation" element={<ProtectedRoute><SpeechChatPage /></ProtectedRoute>} />
            <Route path="ielts" element={<ProtectedRoute><IELTSModule /></ProtectedRoute>} />
            <Route path="ielts/reading" element={<ProtectedRoute><IELTSReadingPage /></ProtectedRoute>} />
            <Route path="ielts/writing" element={<ProtectedRoute><IELTSWritingPage /></ProtectedRoute>} />
            <Route path="ielts/writing/:contentId" element={<ProtectedRoute><IELTSWritingTaskView /></ProtectedRoute>} />
            <Route path="ielts/writing/:contentId/results" element={<ProtectedRoute><IELTSWritingResults /></ProtectedRoute>} />
            <Route path="ielts/listening" element={<ProtectedRoute><IELTSListeningPage /></ProtectedRoute>} />
            <Route path="ielts/listening/:contentId" element={<ProtectedRoute><IELTSListeningTaskView /></ProtectedRoute>} />
            <Route path="ielts/listening/:contentId/results" element={<ProtectedRoute><IELTSListeningResults /></ProtectedRoute>} />
            <Route path="ielts/speaking" element={<ProtectedRoute><IELTSSpeakingPage /></ProtectedRoute>} />
            <Route path="ielts/speaking/:contentId" element={<ProtectedRoute><IELTSSpeakingTaskView /></ProtectedRoute>} />
            <Route path="ielts/speaking/:contentId/results" element={<ProtectedRoute><IELTSSpeakingResults /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="content-library" element={<ProtectedRoute><ContentLibrary /></ProtectedRoute>} />
            <Route path="writing-practice" element={<ProtectedRoute><WritingPractice /></ProtectedRoute>} />
            <Route path="listening-practice" element={<ProtectedRoute><ListeningPractice /></ProtectedRoute>} />
            <Route path="casual-conversations" element={<ProtectedRoute><CasualConversations /></ProtectedRoute>} />
            <Route path="official-conversations" element={<ProtectedRoute><OfficialConversations /></ProtectedRoute>} />
            <Route path="formal-conversations" element={<ProtectedRoute><FormalConversations /></ProtectedRoute>} />
            <Route path="connect-teacher" element={<ProtectedRoute><Connectteacher /></ProtectedRoute>} />
            <Route path="progress-dashboard" element={<ProtectedRoute><EduDashboard /></ProtectedRoute>} />
            <Route path="progress-dashboard/classes" element={<ProtectedRoute><ClassManagement /></ProtectedRoute>} />
            <Route path="progress-dashboard/students/:userId?" element={<ProtectedRoute><StudentDetailsPage /></ProtectedRoute>} />
            <Route path="progress-dashboard/license" element={<ProtectedRoute><LicenseManagement /></ProtectedRoute>} />
            <Route path="skills-home" element={<ProtectedRoute><NewDashboard /></ProtectedRoute>} />
            <Route path="azure-speech-test" element={<ProtectedRoute><AzureSpeechTest /></ProtectedRoute>} />
            <Route path="skills/:skillId" element={<ProtectedRoute><SkillDetail /></ProtectedRoute>} />
            <Route path="reading-page" element={<ProtectedRoute><ReadingPage /></ProtectedRoute>} />
            <Route path="reading-modules" element={<ProtectedRoute><ReadingModulesPage /></ProtectedRoute>} />
            <Route path="speaking-modules" element={<ProtectedRoute><SpeakingModulesPage /></ProtectedRoute>} />
            <Route path="writing-modules" element={<ProtectedRoute><WritingModulesPage /></ProtectedRoute>} />
            <Route path="listening-modules" element={<ProtectedRoute><ListeningModulesPage /></ProtectedRoute>} />
            <Route path="stories" element={<ProtectedRoute><Stories /></ProtectedRoute>} />
            <Route path="story/:storyId" element={<ProtectedRoute><StoryDetail /></ProtectedRoute>} />
            <Route path="stories/results" element={<ProtectedRoute><ReadingAssessmentResultsPage /></ProtectedRoute>} />
            <Route path="novel" element={<ProtectedRoute><Novel /></ProtectedRoute>} />
            <Route path="novel/:novelId" element={<ProtectedRoute><NovelDetail /></ProtectedRoute>} />
            <Route path="novels/results" element={<ProtectedRoute><ReadingAssessmentResultsPage /></ProtectedRoute>} />
            <Route path="phoneme-guide" element={<ProtectedRoute><PhonemeGuide /></ProtectedRoute>} />
            <Route path="sample-videos" element={<ProtectedRoute><VideoContent /></ProtectedRoute>} />
            
            {/* Catch all - redirect to login */}
            <Route path="*" element={<LocalizedNavigate to="/login" replace />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
      </AuthProvider>
      <Toaster />
    </ThemeProvider>
  )
}
