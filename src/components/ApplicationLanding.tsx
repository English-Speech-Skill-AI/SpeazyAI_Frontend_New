import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { ThemeToggle } from "./ThemeToggle";
import {
  ArrowLeft,
  MessageCircle,
  GraduationCap,
  Award,
  LogOut,
  User,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";

interface ApplicationLandingProps {
  onBack: () => void;
  onModuleSelect: (module: string) => void;
  onLogout: () => void;
}

export function ApplicationLanding({
  onBack,
  onModuleSelect,
  onLogout,
}: ApplicationLandingProps) {
  const modules = [
    {
      id: "chat",
      title: "AI Chat Coach",
      description:
        "Interactive AI coaching and conversation practice",
      icon: MessageCircle,
      gradient: "from-[#3B82F6] to-[#00B9FC]",
      iconBg: "#3B82F6",
    },
    {
      id: "academic-samples",
      title: "Academic Content",
      description:
        "School presentations and class-based learning",
      icon: GraduationCap,
      gradient: "from-[#1E3A8A] to-[#3B82F6]",
      iconBg: "#246BCF",
    },
    {
      id: "ielts",
      title: "IELTS Preparation",
      description:
        "Reading, Writing, Listening, Speaking preparation",
      icon: Award,
      gradient: "from-[#00B9FC] to-[#246BCF]",
      iconBg: "#00B9FC",
    },
  ];

  return (
    <div
      data-mello-scroll
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#1E3A8A" }}
    >
      {/* CSS for Typewriter Effect */}
      <style>
        {`
          .typewriter {
            overflow: hidden;
            white-space: nowrap;
            animation: typing 2s steps(40, end);
          }
          @keyframes typing {
            from { width: 0; }
            to { width: 100%; }
          }
        `}
      </style>

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-pulse"
            style={{
              background: "#FFD600",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header
        className="backdrop-blur-lg border-b sticky top-0 z-50"
        style={{
          background: "rgba(30, 58, 138, 0.95)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-[#F2F6FF] hover:text-[#FFD600] hover:bg-white/10 transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>

            <h1
              className="text-lg font-semibold"
              style={{ color: "#F2F6FF" }}
            >
              Choose Module
            </h1>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                className="text-[#F2F6FF] hover:text-[#FFD600] hover:bg-white/10"
              >
                <User className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-[#F2F6FF] hover:text-[#FFD600] hover:bg-white/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#3B82F6]/20 to-[#00B9FC]/20 px-6 py-3 rounded-full border border-[#3B82F6]/30 mb-6">
            <Sparkles
              className="w-5 h-5"
              style={{ color: "#FFD600" }}
            />
            <span style={{ color: "#F2F6FF" }}>
              Select Your Learning Path
            </span>
          </div>

          <h2
            className="text-4xl md:text-5xl font-bold"
            style={{ color: "#F2F6FF" }}
          >
            Welcome to English Skill AI
          </h2>
          <p
            className="text-xl"
            style={{ color: "rgba(242, 246, 255, 0.7)" }}
          >
            Choose a module to start your learning journey
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {modules.map((module) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card
                className="group bg-[#FFFFFF] border-0 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden"
                onClick={() => onModuleSelect(module.id)}
                style={{
                  borderRadius: "16px",
                  boxShadow:
                    "0 8px 32px rgba(59, 130, 246, 0.15)",
                }}
              >
                <CardContent className="p-0">
                  {/* Gradient Header */}
                  <div
                    className={`bg-gradient-to-br ${module.gradient} p-8 relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B82F6]/20 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#3B82F6]/20 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />

                    <div className="relative z-10">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg"
                        style={{ background: module.iconBg }}
                      >
                        <module.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold text-white mb-2">
                        {module.title}
                      </h3>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <p className="text-[#1E3A8A]/70 leading-relaxed mb-4">
                      {module.description}
                    </p>
                    <Button className="w-full bg-gradient-to-r from-[#3B82F6] to-[#00B9FC] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      Get Started
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <Card
          className="bg-gradient-to-r from-[#3B82F6] to-[#00B9FC] border-0 shadow-2xl overflow-hidden"
          style={{
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(59, 130, 246, 0.2)",
          }}
        >
          <CardContent className="p-8 text-center relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B82F6]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#3B82F6]/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <Sparkles
                className="w-12 h-12 mx-auto mb-4"
                style={{ color: "#FFD600" }}
              />
              <h3 className="text-2xl font-bold text-white mb-3">
                Not Sure Where to Start?
              </h3>
              <p className="text-white/90 max-w-2xl mx-auto mb-6">
                Each module is designed to help you improve
                different aspects of your speaking skills. Try
                them all to get the complete experience!
              </p>
              <Button
                onClick={onBack}
                className="bg-white text-[#1E3A8A] hover:bg-white/90 rounded-2xl px-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                Back to Skills Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}