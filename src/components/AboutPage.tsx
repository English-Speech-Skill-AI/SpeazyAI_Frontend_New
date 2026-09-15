"use client"

import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { ThemeToggle } from "./ThemeToggle"
import { ArrowLeft, Target, Heart, Sparkles, Star, Users, Award, Zap } from "lucide-react"
import { useNavigate } from "react-router-dom"

type AboutPageProps = {}

export function AboutPage() {
  const navigate = useNavigate()

  const features = [
    {
      icon: Target,
      title: "Our Mission",
      description: "To empower children worldwide with confident speaking skills through AI-powered learning",
      color: "from-[#3B82F6] to-[#00B9FC]",
    },
    {
      icon: Heart,
      title: "Kid-Friendly",
      description: "Designed with children in mind - safe, engaging, and encouragingly fun!",
      color: "from-[#1E3A8A] to-[#3B82F6]",
    },
    {
      icon: Award,
      title: "Expert-Crafted",
      description: "Lessons developed by speech experts and education professionals",
      color: "from-[#00B9FC] to-[#246BCF]",
    },
    {
      icon: Zap,
      title: "AI-Powered",
      description: "Advanced pronunciation analysis and personalized feedback",
      color: "from-[#246BCF] to-[#3B82F6]",
    },
    {
      icon: Users,
      title: "Community",
      description: "Join thousands of children improving their speaking skills daily",
      color: "from-[#3B82F6] to-[#00B9FC]",
    },
    {
      icon: Sparkles,
      title: "Fun Learning",
      description: "Interactive stories, games, and activities that make learning enjoyable",
      color: "from-[#00B9FC] to-[#3B82F6]",
    },
  ]

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <Star className="absolute top-20 left-20 w-4 h-4 text-[#FFD600] animate-pulse" />
        <Sparkles
          className="absolute top-40 right-32 w-5 h-5 text-[#3B82F6] animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
        <Heart
          className="absolute bottom-40 left-40 w-4 h-4 text-[#00B9FC] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <Star
          className="absolute bottom-20 right-20 w-5 h-5 text-[#FFD600] animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
      </div>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-[#1E3A8A] hover:text-[#3B82F6]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl text-[#1E3A8A]">About Usssssss</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-16 radial-gradient-hero py-12">
          <h2 className="text-5xl md:text-6xl text-[#1E3A8A] mb-6">English Pro AI</h2>
          <div className="w-32 h-1 bg-gradient-to-r from-[#3B82F6] to-[#00B9FC] mx-auto mb-8 rounded-full" />
          <p className="text-xl text-[#1E3A8A]/70 max-w-3xl mx-auto leading-relaxed">
            Building confident communicators through innovative AI technology and expert-designed learning experiences
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group bg-white neumorphic-card border-0 transition-all duration-300 hover:-translate-y-2 cursor-pointer hover:shadow-2xl"
            >
              <CardContent className="p-6">
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl text-[#1E3A8A] mb-3">{feature.title}</h3>
                <p className="text-[#1E3A8A]/70 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Story Section */}
        <Card className="linear-gradient-primary neumorphic-card border-0 shadow-2xl overflow-hidden mb-12">
          <CardContent className="p-8 md:p-12 relative">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <h3 className="text-3xl text-white mb-6 text-center">Our Story</h3>
              <div className="space-y-4 text-white/90 text-lg leading-relaxed max-w-4xl mx-auto">
                <p>
                  English Pro AI was born from a simple observation: many children struggle with public speaking and
                  verbal communication, but traditional methods don't always engage them effectively.
                </p>
                <p>
                  We combined cutting-edge artificial intelligence with proven speech training techniques to create a
                  platform that makes learning fun, interactive, and personalized. Every lesson is designed to build
                  confidence while developing essential communication skills.
                </p>
                <p>
                  Today, thousands of children around the world use English Pro AI to improve their speaking
                  abilities, overcome stage fright, and express themselves with confidence.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { number: "10,000+", label: "Active Students", color: "#3B82F6" },
            { number: "50,000+", label: "Lessons Completed", color: "#00B9FC" },
            { number: "95%", label: "Satisfaction Rate", color: "#FFD600" },
          ].map((stat, index) => (
            <Card
              key={index}
              className="bg-white neumorphic-card border-0 text-center p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <p className="text-5xl mb-2" style={{ color: stat.color }}>
                {stat.number}
              </p>
              <p className="text-[#1E3A8A]/60">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
