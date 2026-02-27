"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { ThemeToggle } from "./ThemeToggle"
import { ArrowLeft, Mail, MessageCircle, Send, MapPin, Phone, Clock, Sparkles, Star, CheckCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate form submission
    setSubmitted(true)
    setTimeout(() => {
      setName("")
      setEmail("")
      setSubject("")
      setMessage("")
      setSubmitted(false)
    }, 3000)
  }

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
        <Mail
          className="absolute bottom-40 left-40 w-5 h-5 text-[#00B9FC] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <Star
          className="absolute bottom-20 right-20 w-4 h-4 text-[#FFD600] animate-pulse"
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
              Back to Home
            </Button>
            <h1 className="text-lg bg-gradient-to-r from-[#3B82F6] to-[#00B9FC] bg-clip-text text-transparent">
              Contact Us
            </h1>
            <div className="w-24" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12 radial-gradient-hero py-12">
          <h2 className="text-5xl md:text-6xl text-[#1E3A8A] mb-6">Get In Touch</h2>
          <div className="w-32 h-1 bg-gradient-to-r from-[#3B82F6] to-[#00B9FC] mx-auto mb-8 rounded-full" />
          <p className="text-xl text-[#1E3A8A]/70 max-w-2xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <div className="lg:col-span-1 space-y-6">
            {[
              {
                icon: Mail,
                title: "Email Us",
                info: "support@englishskills.ai",
                color: "from-[#3B82F6] to-[#00B9FC]",
              },
              {
                icon: Phone,
                title: "Call Us",
                info: "+1 (555) 123-4567",
                color: "from-[#00B9FC] to-[#246BCF]",
              },
              {
                icon: MapPin,
                title: "Visit Us",
                info: "123 Education St, Learning City",
                color: "from-[#246BCF] to-[#3B82F6]",
              },
              {
                icon: Clock,
                title: "Working Hours",
                info: "Mon-Fri: 9AM - 6PM EST",
                color: "from-[#1E3A8A] to-[#3B82F6]",
              },
            ].map((item, index) => (
              <Card
                key={index}
                className="group bg-white neumorphic-card border-0 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="p-6 flex items-start space-x-4">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-[#1E3A8A] mb-1">{item.title}</h4>
                    <p className="text-sm text-[#1E3A8A]/60">{item.info}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white neumorphic-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-2xl text-[#1E3A8A] flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-[#3B82F6]" />
                  Send us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#3B82F6] to-[#00B9FC] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl text-[#1E3A8A] mb-2">Message Sent!</h3>
                    <p className="text-[#1E3A8A]/70">Thank you for contacting us. We'll get back to you soon.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[#1E3A8A]">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-12 bg-[#F2F3F4] border-0 text-[#1E3A8A] placeholder:text-[#1E3A8A]/40 focus:ring-2 focus:ring-[#3B82F6] rounded-xl neumorphic-inset"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[#1E3A8A]">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 bg-[#F2F3F4] border-0 text-[#1E3A8A] placeholder:text-[#1E3A8A]/40 focus:ring-2 focus:ring-[#3B82F6] rounded-xl neumorphic-inset"
                      />
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-[#1E3A8A]">
                        Subject
                      </Label>
                      <Input
                        id="subject"
                        type="text"
                        placeholder="What is this about?"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                        className="h-12 bg-[#F2F3F4] border-0 text-[#1E3A8A] placeholder:text-[#1E3A8A]/40 focus:ring-2 focus:ring-[#3B82F6] rounded-xl neumorphic-inset"
                      />
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-[#1E3A8A]">
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us more..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        rows={6}
                        className="bg-[#F2F3F4] border-0 text-[#1E3A8A] placeholder:text-[#1E3A8A]/40 focus:ring-2 focus:ring-[#3B82F6] rounded-xl resize-none neumorphic-inset"
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full h-12 linear-gradient-primary text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Info */}
        <Card className="mt-12 linear-gradient-primary neumorphic-card border-0 shadow-2xl overflow-hidden">
          <CardContent className="p-8 text-center relative">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <Sparkles className="w-12 h-12 text-[#FFD600] mx-auto mb-4" />
              <h3 className="text-2xl text-white mb-3">Looking for Support?</h3>
              <p className="text-white/90 max-w-2xl mx-auto">
                Check out our FAQ section for quick answers to common questions, or reach out to our support team for
                personalized assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
