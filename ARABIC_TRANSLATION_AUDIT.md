# Arabic Translation Audit – English Learning App

This document identifies all static text and labels in the codebase that can be translated to Arabic when:
1. **User's login/region** indicates Arabic-speaking region (e.g., from API or geo)
2. **User's preferred language** is selected as Arabic (e.g., in profile/settings)

---

## Current State

- **No i18n/translation system** – No `react-i18next`, `react-intl`, or similar
- **No language preference** – Only theme (dark/light) is stored in `ThemeProvider`
- **No region detection** – Auth uses email/password only; no country/locale from API
- **User interface** – `AuthContext` User has: `first_name`, `last_name`, `email`, `role`, `organisation_id`, `organisation_name`, `class` – **no `locale` or `preferred_language`**

---

## Implementation Prerequisites

To support Arabic translation, you will need to:

1. **Add language preference** – Either:
   - Extend User/profile API to include `preferred_language` or `locale`
   - Add a language selector in Profile/Settings and store in `localStorage` (e.g. `speech-skills-locale`)
   - Detect region from IP/geo if available from backend

2. **Add i18n library** – e.g. `react-i18next` + `i18next`

3. **Create translation files** – `locales/en.json`, `locales/ar.json`

---

## Translatable Text by Category

### 1. Auth & Public Pages

| File | Static Text / Labels |
|------|----------------------|
| **LoginPage.tsx** | "Loading...", "Please enter your email or username", "Please enter your password", "Login successful! 🎉", "Welcome back! Redirecting to your dashboard...", "Login failed", "Welcome Back", "Sign in to continue your learning journey", "Email or Username", "Enter your email", "Password", "Enter your password", "Forgot Password?", "Signing In...", "Sign In", "Secure Login • Professional Platform" |
| **SignUpPage.tsx** | "Passwords do not match!", "Please accept the terms and conditions", "Weak", "Good", "Strong", "Back", "Join Us Today", "Start your learning journey", "Full Name", "Enter your full name", "Email Address", "Enter your email", "Password", "Confirm Password", "I agree to the terms and conditions", "Create Account", "Already have an account? Sign In" |
| **ForgotPasswordPage.tsx** | "Reset Password", "Enter your email address", "Please enter your email address", "Please enter a valid email address", "Reset link sent!", "Please check your email for password reset instructions.", "Failed to send reset link", "Send Reset Link", "Back to Login" |
| **AuthContext.tsx** | "Invalid email or password. Please try again.", "Login failed with status...", "Login failed. Please check your credentials.", "Network error. Please check your connection...", "An unexpected error occurred. Please try again." |

---

### 2. Landing & Navigation

| File | Static Text / Labels |
|------|----------------------|
| **HomePage.tsx** | NAV_ITEMS: "Home", "About", "Courses", "Features", "Contact", "Contact Us", "Sign In", "English Skill AI", "Open menu", hero text, feature descriptions, CTA buttons |
| **AboutPage.tsx** | "About Us", "Back", "English Skill AI", "Building confident communicators...", "Our Mission", "Kid-Friendly", "Expert-Crafted", "Our Story", "Active Students", "Lessons Completed", "Satisfaction Rate", feature titles/descriptions |
| **ContactPage.tsx** | "Back to Home", "Contact Us", "Get In Touch", "Have questions? We'd love to hear from you...", "Email Us", "Call Us", "Visit Us", form labels, placeholders, "Send Message", "Message sent successfully!" |
| **PageHeader.tsx** | "English Skill AI", streak text (e.g. "X day(s) streak"), "Progress Dashboard" |
| **ApplicationLanding.tsx** | "AI Chat Coach", "Academic Content", "IELTS Preparation", module descriptions |

---

### 3. Dashboard & Profile

| File | Static Text / Labels |
|------|----------------------|
| **NewDashboard.tsx** | "Welcome back, {name}! 👋", "Ready to practice your speaking skills today?", "You're on a X-day streak! Keep it up! 👋🎉", "Ready to start your learning journey? 👋", module titles: "Speaking", "Writing", "Reading", "Listening", "IELTS Preparation", "AI Tutor", descriptions, stat labels: "Speaking Time", "App Usage Time", "Streak Days", "Improvement" |
| **Profile.tsx** | "Profile", "Back", "My Profile", "Edit Profile", "Streak", "Usage Time", "Improvement", name/email labels |
| **Connectteacher.tsx** | All UI labels and copy |

---

### 4. Content Modules

| File | Static Text / Labels |
|------|----------------------|
| **SpeakingModulesPage.tsx** | "Famous Speeches", "Academic Speech", "Custom Content", descriptions |
| **ListeningModulesPage.tsx** | "Beginner", "Intermediate", "Advanced", descriptions |
| **ReadingModulesPage.tsx** | "My Lessons", "Stories", "Novel", "Content Library", "Phoneme Guide", "Sample Videos", descriptions |
| **WritingModulesPage.tsx** | "Writing Practice", "Beginner", "Intermediate", "Advanced", descriptions |

---

### 5. Content & Practice Data

| File | Static Text / Labels |
|------|----------------------|
| **data.ts** | Speech titles ("Speech 1: My School", "Speech 2: My Mother", etc.), class descriptions ("Fun learning for young minds", etc.), speech content |
| **practiceData.ts** (writing-practice) | Practice tile titles ("About Me", "My Family", "Adventure Story", "Opinion Essay", etc.), descriptions, questions, prompts |
| **FamousSpeeches.tsx** | Speech titles ("I Have a Dream", "Words of Peace", etc.), descriptions, kid-friendly text, quiz sentences |
| **StoryDetail.tsx** | Story titles ("The Adventure Begins", "Magic Forest", "Friendship Tales"), content |
| **NovelDetail.tsx** | Novel titles ("The Mystery Island", "Chronicles of Wisdom", "The Great Journey"), content |

---

### 6. IELTS Module

| File | Static Text / Labels |
|------|----------------------|
| **IELTSModule.tsx** | "READING", "WRITING", "LISTENING", "SPEAKING", descriptions |
| **IELTSReadingPage.tsx** | "Authentication required. Please log in.", "Failed to load reading content...", "Comprehension Questions", "Select the best answer..." |
| **IELTSWritingPage.tsx** | Auth/error messages, task labels |
| **IELTSListeningPage.tsx** | Auth/error messages |
| **IELTSListeningTaskView.tsx** | "Back to Listening", "Listening Exercise", error messages |
| **IELTSWritingTaskView.tsx** | Error messages, task labels |
| **IELTSSpeakingTaskView.tsx** | "Speaking Exercise", band descriptors, scoring prompts |
| **IELTSSpeakingResults.tsx** | Result labels |
| **IELTSListeningResults.tsx** | Result labels |
| **IELTSWritingResults.tsx** | Result labels |

---

### 7. Content Library & Custom Content

| File | Static Text / Labels |
|------|----------------------|
| **ContentLibrary.tsx** | "Content Library", "Upload Content", "Add New", table headers, "Failed to load content library...", "Please select a PDF file only", "Please enter a title", "Please select a class", "Content uploaded successfully!", toast messages |
| **CustomContent.tsx** | Similar labels and toast messages |
| **MyLessons.tsx** | "Failed to load lessons...", "Lesson deleted.", "Invalid lesson id.", toast messages |

---

### 8. Assessment & Results

| File | Static Text / Labels |
|------|----------------------|
| **SpeakingAssessmentResults.tsx** | Result labels, feedback text |
| **ReadingAssessmentResults.tsx** | Result labels, feedback text |
| **SpeechAssessmentResults.tsx** | Result labels |
| **assessmentResults.tsx** | Result UI text |
| **loadingAssessment.tsx** | "Processing PDF...", "Extracting text content from PDF..." |
| **PdfLoadingScreen.tsx** | Loading messages |

---

### 9. Recording & Audio

| File | Static Text / Labels |
|------|----------------------|
| **audioRecorder.tsx** | "Record", "Stop", "Playing...", error messages |
| **IELTSAudioRecorder.tsx** | Similar |
| **ReadingAudioRecorder.tsx** | Similar |
| **SpeakingAudioRecorder.tsx** | Similar |

---

### 10. Writing Practice

| File | Static Text / Labels |
|------|----------------------|
| **WritingPractice.tsx** | Level labels, descriptions |
| **WritingPracticeQuestion.tsx** | "Please write your answer before submitting.", "Cannot connect to the ChatGPT proxy server...", error messages |
| **WritingBeginner.tsx** | Level-specific prompts |
| **WritingIntermediate.tsx** | Level-specific prompts |
| **WritingAdvanced.tsx** | Level-specific prompts |
| **AboutMe.tsx**, **AboutMyself.tsx** | Form labels |
| **PracticeTiles.tsx** | Tile labels |

---

### 11. Listening Practice

| File | Static Text / Labels |
|------|----------------------|
| **ListeningPractice.tsx** | "Casual", "Formal", "Official", descriptions |
| **CasualConversations.tsx** | Conversation titles, content |
| **FormalConversations.tsx** | Conversation titles, content |
| **OfficialConversations.tsx** | Conversation titles, content |
| **ListeningBeginner.tsx**, **ListeningIntermediate.tsx**, **ListeningAdvanced.tsx** | Level labels |

---

### 12. Dashboard (Edu/Admin)

| File | Static Text / Labels |
|------|----------------------|
| **EduDashboard.tsx** | "Progress Dashboard", class/student labels, table headers |
| **ClassManagement.tsx** | "Classes", "Add Class", "Students", table headers, "Classes updated successfully.", error messages |
| **StudentdetailsPage.tsx** | Student detail labels |
| **LicenseManagement.tsx** | License-related labels |
| **dashboard/PageHeader.tsx** | Header labels |

---

### 13. Chat & Support

| File | Static Text / Labels |
|------|----------------------|
| **ChatWithAI.tsx** | "Hello! I'm your AI Assistant. How can I help you today?" |
| **SpeechChatPage.tsx** | Chat UI labels |
| **SupportChatbot.tsx** | Support chat labels and prompts |
| **ChatSelectionPage.tsx** | Selection labels |

---

### 14. Other Components

| File | Static Text / Labels |
|------|----------------------|
| **PhonemeGuide.tsx** | Phoneme labels, instructions |
| **EmbeddedPhonemeChart.tsx** | Chart labels |
| **QuickPractice.tsx** | Practice labels |
| **SkillDetail.tsx** | Skill labels |
| **Stories.tsx** | Story list labels |
| **Novel.tsx** | Novel list labels |
| **VideoContent.tsx** | Video labels |
| **AcademicSamples.tsx** | Academic content labels |

---

### 15. UI Components (shadcn/ui)

| File | Translatable Content |
|------|----------------------|
| **sonner.tsx** | Toast defaults (if any) |
| **dialog.tsx** | `aria-label`, `aria-describedby` |
| **command.tsx** | Placeholder text |
| **pagination.tsx** | "Previous", "Next" |
| **breadcrumb.tsx** | Breadcrumb labels |
| **sidebar.tsx** | Sidebar labels |

---

## Date/Number Formatting

These use `toLocaleDateString()` / `toLocaleString()` – they will automatically adapt to Arabic locale if you pass `'ar'` or `'ar-SA'`:

- **ContentLibrary.tsx** – `toLocaleDateString()`
- **CustomContent.tsx** – `toLocaleDateString()`
- **StudentdetailsPage.tsx** – `toLocaleDateString()`, `toLocaleTimeString()`
- **EduDashboard.tsx** – `toLocaleString()`, `toLocaleDateString()`, `toLocaleTimeString()`
- **chart.tsx** – `toLocaleString()` for chart values

---

## Summary

| Category | Approx. Files | Notes |
|----------|---------------|-------|
| Auth & Public | 4 | Login, SignUp, ForgotPassword, AuthContext |
| Landing & Nav | 5 | Home, About, Contact, PageHeader, ApplicationLanding |
| Dashboard & Profile | 3 | NewDashboard, Profile, Connectteacher |
| Content Modules | 4 | Speaking, Listening, Reading, Writing modules |
| Content Data | 5+ | data.ts, practiceData.ts, FamousSpeeches, StoryDetail, NovelDetail |
| IELTS | 10+ | All IELTS pages and task views |
| Content Library | 3 | ContentLibrary, CustomContent, MyLessons |
| Assessment | 5+ | Results, loading screens |
| Recording | 4 | All audio recorders |
| Writing Practice | 8+ | Writing components and practice tiles |
| Listening Practice | 6+ | Listening components |
| Edu Dashboard | 4+ | EduDashboard, ClassManagement, etc. |
| Chat & Support | 4 | ChatWithAI, SupportChatbot, etc. |
| Other | 8+ | PhonemeGuide, Stories, Novel, etc. |
| UI Components | 6+ | shadcn components |

**Total: ~80+ component files** with hardcoded English text suitable for Arabic translation.

---

## Recommended Next Steps

1. Add `preferred_language` to user profile (API + UI) or use `localStorage` for language preference.
2. Install `react-i18next` and `i18next`.
3. Create `locales/en.json` and `locales/ar.json` with all keys.
4. Wrap the app in `I18nextProvider` and use `useTranslation()` in components.
5. Add RTL support for Arabic (`dir="rtl"` on `<html>` when locale is `ar`).
6. Replace all hardcoded strings with `t('key')` calls.
7. Ensure date/number formatting uses `toLocaleDateString('ar')` when Arabic is selected.
