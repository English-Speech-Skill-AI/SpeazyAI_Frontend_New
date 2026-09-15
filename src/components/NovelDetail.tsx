"use client"

import { useLocation, useParams } from "react-router-dom"
import { useLocalizedNavigate } from "./LocaleLayout"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { ArrowLeft, BookOpenCheck } from "lucide-react"
import { ReadingAudioRecorder } from "./reading/ReadingAudioRecorder"
import { motion } from "motion/react"
import type { CSSProperties } from "react"

const BLUE_BG: CSSProperties = {
  backgroundColor: "#1E3A8A",
  backgroundAttachment: "fixed",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
}

const novelContents: Record<string, { title: string; content: string }> = {
  "novel-1": {
    title: "The Mystery Island",
    content: `Chapter 1: The Discovery

It was a bright morning when Captain Sarah received the mysterious letter. The envelope was old, yellowed with age, and sealed with red wax bearing the image of an island.

"To the brave explorer," the letter read. "The Mystery Island awaits. Only the courageous will unlock its secrets. Follow the stars, trust your instincts, and remember - not all treasures are gold."

Captain Sarah had been sailing the seas for twenty years, but she had never heard of the Mystery Island. Her curiosity was piqued. She gathered her crew and set sail at dawn.

The journey took three days and three nights. On the morning of the fourth day, they spotted land - a beautiful island covered in lush green forests with a mountain at its center that seemed to touch the clouds.

Chapter 2: The Hidden Path

As they approached the island, they noticed something unusual. The trees seemed to move, creating a path that led deeper into the forest. Captain Sarah decided to explore.

Her first mate, James, was hesitant. "Captain, we don't know what's on this island. It could be dangerous."

But Captain Sarah was determined. "Sometimes, the greatest adventures require us to step into the unknown. Let's go."

They followed the path through the forest, which was alive with sounds of exotic birds and rustling leaves. Strange flowers that glowed at night guided their way.

After hours of walking, they came to a clearing where an ancient stone circle stood. In the center, there was a pedestal with an inscription.

"The key is not what you seek, but what you already have," it read.

Chapter 3: The True Treasure

Captain Sarah thought about the words. What did she already have? She looked around at her crew - her friends, her family. That was it! The true treasure wasn't gold or jewels - it was friendship, trust, and the bonds they had formed.

As she realized this, the ground began to glow. The stone circle lit up, and from the center emerged not a chest of gold, but a beautiful garden full of fruits and flowers that would help many people.

The Mystery Island wasn't about finding treasure - it was about discovering what truly matters in life. Captain Sarah and her crew returned home with their hearts full, knowing they had found something more valuable than any gold.`,
  },
  "novel-2": {
    title: "Chronicles of Wisdom",
    content: `Chapter 1: The Old Library

In the town of Wisdomville, there was an ancient library that few people visited. It stood at the top of a hill, its walls covered in ivy, and its windows reflecting the light of a thousand stories.

Young Emma loved books more than anything. Every day after school, she would climb the hill to visit the library, spending hours reading stories from around the world.

One rainy afternoon, as she was browsing the shelves, she found a book that seemed to call to her. It had no title, and its cover was made of what felt like ancient leather.

When she opened it, the pages were blank. But as she touched them, words began to appear - words that told stories of wisdom, courage, and kindness from people throughout history.

Chapter 2: The Stories Within

The book contained tales from wise teachers, brave leaders, and kind souls who had helped others throughout the ages. Each story taught Emma something new about how to live a good life.

She read about a teacher who helped children learn even when times were difficult. She learned about a leader who chose peace over war. She discovered stories of people who showed kindness even when it was hard.

Each chapter opened Emma's mind to new ways of thinking. She realized that wisdom wasn't about knowing everything - it was about understanding how to be good to others and how to make the world a better place.

Chapter 3: Sharing the Wisdom

Emma knew she couldn't keep these stories to herself. She started sharing them with her friends, her family, and even her teachers. Soon, other children began visiting the library, and they too found books that spoke to them.

The old library became a place of learning and sharing. Children came not just to read, but to discuss what they learned and how they could use wisdom in their own lives.

Emma grew up to become a teacher herself, passing on the wisdom she had discovered. The library remained a special place, where each generation could find the stories they needed to understand life's important lessons.

And so, the Chronicles of Wisdom continued, passed from one person to another, helping each new generation learn how to live with kindness, courage, and understanding.`,
  },
  "novel-3": {
    title: "The Great Journey",
    content: `Chapter 1: The Call to Adventure

Marcus had lived in the same small village his entire life. He knew every path, every tree, and every face. But something inside him yearned for something more - an adventure, a journey to see the world beyond the mountains.

One evening, an old traveler came to the village. He told stories of distant lands, of oceans that stretched to the horizon, of cities that touched the sky, and of people who lived in ways Marcus had never imagined.

"Every great journey begins with a single step," the traveler said. "The question is: are you ready to take that step?"

That night, Marcus couldn't sleep. He packed a bag, left a note for his family, and at dawn, began walking toward the mountains he had always seen but never crossed.

Chapter 2: Challenges and Friends

The journey was not easy. Marcus faced steep mountains, rushing rivers, and long days of walking. But he also met wonderful people along the way.

In the mountain pass, he met Elena, a guide who showed him the safest paths. At the river, he met Tom, a boat maker who helped him cross. In the forests, he met Luna, a traveler who shared her food and stories.

Each person he met taught him something new - about navigation, about survival, about the importance of helping others. Marcus realized that his journey was not just about reaching a destination, but about the people he met and the lessons he learned.

Chapter 3: The Destination and Beyond

After months of traveling, Marcus reached the ocean. He stood on the shore, watching the endless water stretch before him. He had seen so much, learned so much, and grown so much.

But he realized that the journey wasn't over - it had only just begun. There were still more places to see, more people to meet, more stories to discover.

Marcus decided to keep traveling, but now he traveled with purpose. He helped others on their journeys, shared what he had learned, and always kept an open heart and mind.

Years later, when he returned to his village, he came back not as the boy who had left, but as a man who had seen the world and understood that every journey, no matter how long or short, changes us in ways we can't imagine.

The great journey taught Marcus that life itself is an adventure, and that every step we take is part of our own unique story.`,
  },
}

export function NovelDetail() {
  const navigate = useLocalizedNavigate()
  const location = useLocation()
  const { novelId } = useParams<{ novelId: string }>()
  const backRoute = (location.state as any)?.backRoute || "/novel"

  const novel = novelId ? novelContents[novelId] : null

  // Handle API response - navigate to results page
  const handleApiResponse = (responseData: any) => {
    console.log("handleApiResponse called with:", responseData)
    const apiResponse = responseData?.apiResponse || responseData
    const audioUrl = responseData?.audioUrl || null
    
    if (apiResponse && !apiResponse.error && novel && novelId) {
      console.log("Navigating to reading results page...")
      // Navigate to reading results page with the API response data and audio URL
      navigate("/novels/results", {
        state: {
          apiResponse,
          audioUrl,
          novel: {
            id: novelId,
            title: novel.title,
            content: novel.content
          },
          moduleType: "NOVEL",
          moduleKey: novelId.replace("-", "_"), // novel-1 -> novel_1
          moduleTitle: novel.title,
          backRoute: `/novel/${novelId}`,
        },
        replace: false, // Allow back button to work
      })
    } else {
      console.log("API response has error or is invalid:", apiResponse)
    }
  }

  if (!novel) {
    return (
      <div className="h-screen flex flex-col items-center justify-center" style={BLUE_BG}>
        <h2 className="text-white text-2xl mb-4">Novel not found</h2>
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
            <h1 className="text-xl font-semibold text-white">{novel.title}</h1>
            <div className="w-10 h-10" />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
          <style>{`
            @media (max-width: 1024px) {
              .novel-content-wrapper {
                flex-direction: column !important;
                gap: 1.5rem !important;
              }
              .novel-content-main {
                width: 100% !important;
              }
              .novel-recording-sidebar {
                width: 100% !important;
                position: relative !important;
                top: 0 !important;
                margin-top: 0 !important;
              }
            }
          `}</style>
          <div className="flex gap-12 items-start novel-content-wrapper">
            {/* Content - Left side */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 min-w-0 novel-content-main"
            >
              <Card className="bg-white border-0 shadow-xl mb-6">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#00B9FC] to-[#246BCF] rounded-3xl flex items-center justify-center mb-4 mx-auto">
                    <BookOpenCheck className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-3xl text-[#1E3A8A] mb-2">{novel.title}</CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-white border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-[#1E3A8A] flex items-center gap-2">
                    <BookOpenCheck className="w-6 h-6" />
                    Novel Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-lg max-w-none">
                    <div className="text-gray-800 leading-relaxed text-justify whitespace-pre-line space-y-4">
                      {novel.content.split("\n\n").map((paragraph, index) => (
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
              className="w-[400px] flex-shrink-0 novel-recording-sidebar"
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
                    Read the novel aloud and get feedback on your pronunciation!
                  </p>
                </CardHeader>

                <CardContent>
                  <ReadingAudioRecorder
                    expectedText={novel.content}
                    lessonColor="from-[#00B9FC] to-[#246BCF]"
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

