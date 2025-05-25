import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ModeSelection() {
  const [, navigate] = useLocation();

  const modes = [
    {
      id: "shopping",
      title: "Shopping Mode",
      icon: "🛒",
      description: "Get personalized recipes with complete shopping lists tailored to your preferences and budget",
      gradient: "gradient-primary",
      color: "orange"
    },
    {
      id: "fridge",
      title: "Fridge to Fork",
      icon: "🥦",
      description: "Transform available ingredients into delicious meals with zero waste and maximum creativity",
      gradient: "gradient-secondary",
      color: "emerald"
    },
    {
      id: "chef",
      title: "Chef Assist",
      icon: "👨‍🍳",
      description: "Get expert-level guidance for special occasions and culinary ambitions",
      gradient: "gradient-accent",
      color: "amber"
    }
  ];

  const handleModeSelect = (modeId: string) => {
    navigate(`/app/${modeId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-emerald-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-orange-200 to-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 floating"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-gradient-to-r from-emerald-200 to-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 floating-delayed"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-amber-200 to-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 floating"></div>
      </div>

      <Header />
      
      <main className="container mx-auto px-6 py-8 relative z-10 pb-24">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold text-display leading-tight mb-4" style={{
            background: 'var(--gradient-dopamine)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Choose Your Mode
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            Select how you'd like to create your next amazing meal with AI
          </p>
        </div>

        {/* Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {modes.map((mode, index) => (
            <Card 
              key={mode.id}
              className={`glass card-modern group border-0 shadow-2xl hover:shadow-${mode.color}-200/50 transition-all duration-500 cursor-pointer animate-scale-in`}
              style={{ animationDelay: `${index * 150}ms` }}
              onClick={() => handleModeSelect(mode.id)}
            >
              <CardHeader className="text-center pb-4">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className={`w-20 h-20 ${mode.gradient} rounded-3xl flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-xl text-4xl`}>
                    {mode.icon}
                  </div>
                  <div className={`absolute inset-0 ${mode.gradient} rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500`}></div>
                </div>
                <CardTitle className="text-2xl font-playfair font-bold text-slate-800 mb-2">
                  {mode.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="text-center pb-8">
                <p className="text-slate-600 leading-relaxed mb-6">
                  {mode.description}
                </p>
                <Button 
                  className="w-full h-14 text-white font-bold shadow-xl transition-all duration-500 hover:scale-105 relative overflow-hidden group"
                  style={{ background: `var(--gradient-${mode.id === 'shopping' ? 'primary' : mode.id === 'fridge' ? 'secondary' : 'accent'})` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleModeSelect(mode.id);
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  <span className="relative z-10 tracking-wide text-lg">Start {mode.title}</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Back to Landing */}
        <div className="text-center mt-12">
          <Button
            variant="ghost"
            className="text-slate-600 hover:text-slate-800 transition-colors"
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}