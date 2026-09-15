"use client"

import { useLocation, useParams } from "react-router-dom"
import { useLocalizedNavigate } from "./LocaleLayout"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { ArrowLeft, BookMarked } from "lucide-react"
import { ReadingAudioRecorder } from "./reading/ReadingAudioRecorder"
import { motion } from "motion/react"
import type { CSSProperties } from "react"

const BLUE_BG: CSSProperties = {
  backgroundColor: "#1E3A8A",
  backgroundAttachment: "fixed",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
}

const storyContents: Record<string, { title: string; content: string }> = {
  "story-1": {
    title: "The Adventure Begins",
    content: `Once upon a time, in a small village near the mountains, there lived a curious young explorer named Alex. Alex loved to discover new places and meet new friends.

Every morning, Alex would wake up early, pack a small bag with snacks and a map, and set off on a new adventure. Today was special because Alex had found an old treasure map in the attic.

The map showed a path through the Magic Forest, across the Sparkling River, and up to the Whispering Mountain. "This looks exciting!" Alex thought.

As Alex walked through the Magic Forest, the trees seemed to dance in the wind, and colorful birds sang beautiful songs. The forest was full of life and wonder.

"Hello there!" said a friendly rabbit, hopping along the path. "Are you looking for the treasure too?"

"Yes! Would you like to join me?" Alex replied with a smile.

Together, they crossed the Sparkling River on a bridge made of rainbow-colored stones. The water below sparkled like diamonds in the sunlight.

Finally, they reached the Whispering Mountain. At the top, they found not gold or jewels, but something even better - a chest full of wonderful stories from around the world.

Alex realized that the real treasure was the adventure itself and the friendship made along the way.`,
  },
  "story-2": {
    title: "Magic Forest",
    content: `Deep in the heart of the Magic Forest, where sunlight filters through emerald leaves, there lived a wise old owl named Oliver. Oliver was the keeper of the forest's secrets and the friend of all creatures.

The Magic Forest was no ordinary place. Flowers could sing, trees could whisper stories, and the streams carried messages from one part of the forest to another.

One day, a young deer named Luna lost her way. She was scared and couldn't find her family. But the Magic Forest had its own way of helping those in need.

The singing flowers directed Luna to follow their melodies, which led her to the Great Oak Tree where Oliver lived.

"Don't worry, little one," said Oliver in a gentle voice. "The forest will guide you home. Listen to the wind, watch the fireflies, and trust your heart."

The fireflies created a glowing path that danced through the trees. Luna followed the magical light, and soon she found her family waiting for her at the edge of the meadow.

The Magic Forest had worked its wonders once again, teaching Luna that help is always nearby if we just know where to look.

From that day on, Luna became a friend to all forest creatures, always ready to help others find their way, just as the forest had helped her.`,
  },
  "story-3": {
    title: "Friendship Tales",
    content: `In a cozy neighborhood, there lived three best friends: Maya the cat, Ben the dog, and Sam the bird. They were different in many ways, but their friendship was stronger than any difference.

Maya loved to read books and learn new things. Ben enjoyed playing games and making everyone laugh. Sam could fly high and see the world from above, sharing wonderful stories.

Every afternoon, they would meet at their special tree - a big oak in the park where they could play, share stories, and help each other with problems.

One day, Maya was sad because she couldn't solve a difficult puzzle in her book. Ben saw her sadness and immediately started making funny faces to cheer her up. Sam flew down and said, "Don't worry, Maya! We can figure this out together."

They worked together, combining Maya's reading skills, Ben's creative thinking, and Sam's ability to see things from different angles. Soon, they solved the puzzle!

"Friendship is the best puzzle piece of all!" Maya said with a smile.

The three friends learned that day that when you share your strengths and help each other, you can accomplish anything. Their friendship grew even stronger, and they continued to have many adventures together, always supporting and caring for one another.

True friends are like stars - you don't always see them, but you know they're always there, shining bright.`,
  },
}

export function StoryDetail() {
  const navigate = useLocalizedNavigate()
  const location = useLocation()
  const { storyId } = useParams<{ storyId: string }>()
  const backRoute = (location.state as any)?.backRoute || "/stories"

  const story = storyId ? storyContents[storyId] : null

  // Handle API response - navigate to results page
  const handleApiResponse = (responseData: any) => {
    console.log("handleApiResponse called with:", responseData)
    const apiResponse = responseData?.apiResponse || responseData
    const audioUrl = responseData?.audioUrl || null
    
    if (apiResponse && !apiResponse.error && story && storyId) {
      console.log("Navigating to reading results page...")
      // Navigate to reading results page with the API response data and audio URL
      navigate("/stories/results", {
        state: {
          apiResponse,
          audioUrl,
          story: {
            id: storyId,
            title: story.title,
            content: story.content
          },
          moduleType: "STORIES",
          moduleKey: storyId.replace("-", "_"), // story-1 -> story_1
          moduleTitle: story.title,
          backRoute: `/story/${storyId}`,
        },
        replace: false, // Allow back button to work
      })
    } else {
      console.log("API response has error or is invalid:", apiResponse)
    }
  }

  if (!story) {
    return (
      <div className="h-screen flex flex-col items-center justify-center" style={BLUE_BG}>
        <h2 className="text-white text-2xl mb-4">Story not found</h2>
        <Button onClick={() => navigate(backRoute)}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col relative overflow-x-hidden w-full">
      <div className="absolute inset-0 -z-10" style={BLUE_BG} />

      <header className="sticky top-0 z-50 backdrop-blur-sm bg-white/10 border-b border-white/10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(backRoute)}
              className="text-white hover:bg-white/10 rounded-2xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-white">{story.title}</h1>
            <div className="w-10 h-10" />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
          <style>{`
            @media (max-width: 1024px) {
              .story-content-wrapper {
                flex-direction: column !important;
                gap: 1.5rem !important;
              }
              .story-content-main {
                width: 100% !important;
              }
              .story-recording-sidebar {
                width: 100% !important;
                position: relative !important;
                top: 0 !important;
                margin-top: 0 !important;
              }
            }
          `}</style>
          <div className="flex gap-12 items-start story-content-wrapper">
            {/* Content - Left side */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 min-w-0 story-content-main"
            >
              <Card className="bg-white border-0 shadow-xl mb-6">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#3B82F6] to-[#00B9FC] rounded-3xl flex items-center justify-center mb-4 mx-auto">
                    <BookMarked className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-3xl text-[#1E3A8A] mb-2">{story.title}</CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-white border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-[#1E3A8A] flex items-center gap-2">
                    <BookMarked className="w-6 h-6" />
                    Story Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-lg max-w-none">
                    <div className="text-gray-800 leading-relaxed text-justify whitespace-pre-line space-y-4">
                      {story.content.split("\n\n").map((paragraph, index) => (
                        <p key={index} className="mb-4">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recording Section - Right side, positioned to scroll with content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-[400px] flex-shrink-0 story-recording-sidebar"
              style={{
                position: "sticky",
                top: "120px",
                alignSelf: "flex-start",
                height: "fit-content",
              }}
            >
              <Card
                className="bg-[#FFFFFF] border-0 shadow-xl"
                style={{
                  borderRadius: "24px",
                  boxShadow: "0 8px 32px rgba(59, 130, 246, 0.15)",
                }}
              >
                <CardHeader>
                  <CardTitle
                    className="text-xl"
                    style={{ color: "#1E3A8A" }}
                  >
                    🎤 Practice Reading
                  </CardTitle>
                  <p
                    className="text-sm mt-2"
                    style={{ color: "rgba(30, 58, 138, 0.7)" }}
                  >
                    Read the story aloud and get feedback on your pronunciation!
                  </p>
                </CardHeader>

                <CardContent>
                  <ReadingAudioRecorder
                    expectedText={story.content}
                    lessonColor="from-[#3B82F6] to-[#00B9FC]"
                    endpoint="https://apis.languageconfidence.ai/speech-assessment/scripted/uk"
                    onApiResponse={handleApiResponse}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

