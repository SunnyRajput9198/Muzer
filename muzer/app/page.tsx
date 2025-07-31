"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Radio,
  Headphones,
  Play,
  ArrowRight,
  Music,
  Zap
} from "lucide-react";
// console.log(process.env.GOOGLE_CLIENT_ID)
//  console.log(process.env.GOOGLE_CLIENT_SECRET)
import { useSession } from "next-auth/react";
import Appbar from "@/components/Appbar";
import { signIn } from "next-auth/react";
import { useRouter,usePathname } from "next/navigation";
export default function LandingPage() {

  const session = useSession();
  const router = useRouter();
   const pathname = usePathname();

  const handleGetStarted = () => {
    if (session.data?.user) {
      router.push("/home");
    } else {
      signIn();
    }
  };
  console.log(session);
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#121212' }}>
      <Appbar isSpectator={false} />
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>
      {/* Hero Section */}
      <main className="relative z-10 px-6 md:px-8 pt-12 md:pt-20">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center transform transition-all duration-1000 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <Badge className="mb-4 bg-white/10 text-white border-white/20 hover:bg-white/20 transition-colors">
              <Zap className="w-3 h-3 mr-1" />
              Party Mode Enabled
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Let Your Fans
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"> Choose </span>
              the Beat
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transform your music streams with real-time audience interaction.
              Create unforgettable experiences where your fans control the playlist.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="group bg-gradient-to-r from-green-400 to-teal-400 hover:from-green-500 hover:to-teal-500 text-black px-8 py-4 text-lg border-0 shadow-xl shadow-green-500/25"
              >
                <Play className="w-5 h-5 mr-2 transform transition-transform duration-300 group-hover:scale-125" />
                Start Streaming
                <ArrowRight className="w-5 h-5 ml-2 transform transition-transform duration-300 group-hover:translate-x-1" />
              </Button>

            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">10K+</div>
                <div className="text-gray-400 text-sm">Active Streamers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">1M+</div>
                <div className="text-gray-400 text-sm">Songs Played</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">500K+</div>
                <div className="text-gray-400 text-sm">Happy Fans</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-white/10 text-white border-white/20">
              Features
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Everything You Need to
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Engage</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Powerful tools designed to create interactive music experiences
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Fan Interaction</h3>
                <p className="text-gray-300 leading-relaxed">
                  Let your audience vote, request, and curate your playlist in real-time.
                  Build deeper connections through music.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Radio className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Live Streaming</h3>
                <p className="text-gray-300 leading-relaxed">
                  Stream seamlessly with zero latency. Advanced broadcasting
                  technology ensures perfect sync with your audience.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Headphones className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">HD Audio</h3>
                <p className="text-gray-300 leading-relaxed">
                  Crystal clear, lossless audio quality up to 320kbps.
                  Professional-grade streaming for audiophiles.
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">StreamChoice</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Empowering creators to build deeper connections with their audiences
                through interactive music streaming experiences.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 cursor-pointer transition-colors">
                  <span className="text-white text-sm font-bold">f</span>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 cursor-pointer transition-colors">
                  <span className="text-white text-sm font-bold">t</span>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 cursor-pointer transition-colors">
                  <span className="text-white text-sm font-bold">in</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">API</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 StreamChoice. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</Link>
              <Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</Link>
              <Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}