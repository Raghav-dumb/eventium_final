"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Users, ArrowRight, Globe, Sparkles, Zap, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import LandingGlobe from "@/components/landing-globe";

export default function Home() {
  const features = [
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Explore",
      description: "Discover amazing events happening around you. Browse by location, category, or date to find your perfect match.",
      color: "from-blue-500 to-blue-600",
      action: "Browse Events",
      link: "/events"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Connect",
      description: "Join events and connect with like-minded people. Build communities and share experiences together.",
      color: "from-green-500 to-green-600",
      action: "Join Events",
      link: "/events"
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Create",
      description: "Host your own events and bring people together. Share your passion and create memorable experiences.",
      color: "from-purple-500 to-purple-600",
      action: "Create Event",
      link: "/events/create"
    }
  ];

  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const texts = ["Explore.", "Connect.", "Create.", "Enjoy."];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }, 2000); // Change text every 2 seconds

    return () => clearInterval(interval);
  }, [texts.length]);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      window.location.href = '/events';
    } else {
      window.location.href = '/register';
    }
  };

  const handleHostEvent = () => {
    window.location.href = '/events/create';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Globe Background and Content */}
      <section className="relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#9BC4E6] to-[#3C5A7A] min-h-[80vh]">
        {/* Globe Background */}
        <motion.div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="w-[810px] h-[810px] aspect-square transform rotate-90">
            <LandingGlobe />
          </div>
        </motion.div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <motion.h1 
            className="text-6xl md:text-7xl font-bold text-white mb-6"
            key={currentTextIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {texts[currentTextIndex]}
          </motion.h1>
          <motion.p 
            className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            From local meetups to global conferences, find your next adventure.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <button 
              onClick={handleGetStarted}
              className="bg-white text-[#3C5A7A] px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-colors duration-200 mr-4 shadow-lg"
            >
              Get Started
            </button>
            <button 
              onClick={handleHostEvent}
              className="border-2 border-white text-[#3C5A7A] px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-[#3C5A7A] transition-colors duration-200 shadow-lg"
            >
              Host an Event
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple ways to discover, connect, and create amazing events.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="h-full"
              >
                <Card className="h-full flex flex-col border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
                  <CardHeader className="flex-1 pb-6">
                    <div className={`mx-auto w-16 h-16 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-6 text-white`}>
                      {feature.icon}
                    </div>
                    <CardTitle className="text-2xl font-semibold text-gray-900 mb-4">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-600 leading-relaxed text-base">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href={feature.link}>
                      <Button 
                        className={`w-full bg-gradient-to-r ${feature.color} hover:opacity-90 transition-all duration-200 text-white border-0`}
                        size="lg"
                      >
                        {feature.action}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[#5A81C1] to-[#3D64A2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Join thousands of people who are already discovering and creating amazing events.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-white text-[#3D64A2] hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isLoggedIn ? 'Explore Events' : 'Sign Up Now'}
              </Button>
              <Button 
                onClick={handleHostEvent}
                size="lg" 
                variant="outline" 
                className="border-2 border-white text-[#3D64A2] bg-white hover:bg-gray-100 transition-all duration-300"
              >
                Host an Event
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#565656] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center mb-6">
                <img src="/Logo_1.svg" alt="Eventium Logo" className="h-10 w-auto" />
              </div>
              <p className="text-[#D6D6D6] leading-relaxed">
                Making event discovery and management simple, powerful, and enjoyable for everyone.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-6 text-white">Events</h3>
              <ul className="space-y-3 text-[#D6D6D6]">
                <li><Link href="/events" className="hover:text-white transition-colors duration-200">Browse Events</Link></li>
                <li><Link href="/events/create" className="hover:text-white transition-colors duration-200">Create Event</Link></li>
                <li><Link href="/events/my" className="hover:text-white transition-colors duration-200">My Events</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-6 text-white">Account</h3>
              <ul className="space-y-3 text-[#D6D6D6]">
                <li><Link href="/login" className="hover:text-white transition-colors duration-200">Login</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors duration-200">Register</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors duration-200">Dashboard</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-6 text-white">Legal</h3>
              <ul className="space-y-3 text-[#D6D6D6]">
                <li><Link href="/privacy" className="hover:text-white transition-colors duration-200">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors duration-200">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition-colors duration-200">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-[#6F7278] pt-8 text-center text-[#D6D6D6]">
            <p>&copy; 2024 Eventium. All rights reserved.</p>
          </div>
        </div>
            </footer>
    </div>
  );
}
