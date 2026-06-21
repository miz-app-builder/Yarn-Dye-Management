import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login, isLoading } = useAuth();

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-indigo-100">
        <CardHeader className="text-center space-y-2 pb-8">
          <div className="mx-auto w-16 h-16 bg-indigo-600 text-white flex items-center justify-center rounded-xl mb-4 shadow-sm">
            <span className="text-2xl font-bold tracking-tighter">YD</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Welcome to YDMS</CardTitle>
          <CardDescription className="text-base text-gray-500">
            Yarn Dyeing Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Button 
            onClick={login} 
            disabled={isLoading} 
            className="w-full sm:w-auto px-8 bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base"
            data-testid="login-btn"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Sign in with Replit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}