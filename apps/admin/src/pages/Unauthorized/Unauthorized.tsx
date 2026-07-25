import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { landingPath } from '@/config/rbac';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldOff } from 'lucide-react';

const Unauthorized: React.FC = () => {
  const { user } = useAuth();
  const home = landingPath(user?.role);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <ShieldOff className="h-7 w-7 text-destructive" aria-hidden />
          </div>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            Your role does not include permission for this section. Contact a super administrator if you need access.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Button asChild>
            <Link to={home}>{user?.role === 'SHAREHOLDER' ? 'Back to portal' : 'Back to dashboard'}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
