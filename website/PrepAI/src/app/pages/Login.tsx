import { LoginForm } from "@/app/components/LoginForm";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Video, Mic, Zap, Shield, Target } from "lucide-react";

export default function Login() {
  return (
    <div className="size-full flex min-h-screen bg-gradient-to-br from-indigo-50 via-white to-teal-50">
      {/* Left Side - Features & Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1765366417030-16d9765d920a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB3b3Jrc3BhY2UlMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzY4MjMzNzQ5fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Professional interview preparation"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/95 via-purple-900/90 to-teal-900/95" />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-teal-400/20 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-40 left-20 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 mb-8 bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20">
            <div className="w-11 h-11 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                PrepAI
              </h1>
              <p className="text-teal-200 text-sm">
                AI-Powered Practice
              </p>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="inline-block mb-4">
              <span className="bg-teal-400/20 text-teal-200 px-4 py-1.5 rounded-full text-sm font-medium border border-teal-400/30">
                🚀 Join 10,000+ successful candidates
              </span>
            </div>

            <h2 className="text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight">
              Transform
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-300 to-indigo-300">
                Nervousness into Success
              </span>
            </h2>
            <p className="text-xl text-indigo-100 mb-10 leading-relaxed">
              Practice with AI that understands body language,
              tone, and content. Get real-time feedback that
              turns interview anxiety into unstoppable
              confidence.
            </p>

            {/* Feature highlights with better styling */}
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-white bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-teal-400/50 transition-all group">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-medium">
                  AI-powered video & body language analysis
                </span>
              </div>
              <div className="flex items-center gap-4 text-white bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-purple-400/50 transition-all group">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-medium">
                  Voice tone & confidence scoring
                </span>
              </div>
              <div className="flex items-center gap-4 text-white bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-cyan-400/50 transition-all group">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-medium">
                  Personalized improvement roadmap
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Quote with unique design */}
        <div className="relative z-10 max-w-xl bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <blockquote className="text-white/95 italic text-lg mb-2">
                "Confidence isn't about being perfect—it's about
                being prepared."
              </blockquote>
              <p className="text-teal-200 font-medium">
                — PrepAI Mission
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Decorative gradient blob */}
        <div className="absolute top-10 right-10 w-64 h-64 bg-gradient-to-br from-teal-200/30 to-indigo-200/30 rounded-full blur-3xl" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                PrepAI
              </h1>
              <p className="text-gray-600 text-sm">
                AI-Powered Practice
              </p>
            </div>
          </div>

          {/* Login Card with unique shadow */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-200/50 p-8 border border-gray-100 relative overflow-hidden">
            {/* Decorative corner accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-indigo-500/10 rounded-bl-full" />

            <div className="mb-8 relative z-10">
              <div className="inline-flex items-center gap-2 mb-3">
                <h2 className="text-3xl font-bold text-gray-900">
                  Welcome Back
                </h2>
                <span className="text-2xl">👋</span>
              </div>
              <p className="text-gray-600">
                Ready to level up your interview game?
              </p>
            </div>

            <LoginForm />

            {/* Divider with gradient */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">
                  or continue with
                </span>
              </div>
            </div>

            {/* Social Login with better styling */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 h-12 px-4 border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700">
                  Google
                </span>
              </button>
              <button className="flex items-center justify-center gap-2 h-12 px-4 border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700">
                  GitHub
                </span>
              </button>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                <span>256-bit SSL</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                <span>GDPR</span>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <p className="text-center text-sm text-gray-500 mt-6">
            By signing in, you agree to our{" "}
            <button className="text-indigo-600 hover:underline font-medium">
              Terms
            </button>
            {" & "}
            <button className="text-indigo-600 hover:underline font-medium">
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}