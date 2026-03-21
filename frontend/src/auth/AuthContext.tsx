import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js';
import { config } from '../config';

const userPool = new CognitoUserPool({
  UserPoolId: config.cognito.userPoolId,
  ClientId: config.cognito.clientId
});

interface AuthContextType {
  user: CognitoUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => void;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session?.isValid()) {
          setUser(null);
        } else {
          setUser(currentUser);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool
      });

      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password
      });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: () => {
          setUser(cognitoUser);
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: email })
      ];

      userPool.signUp(email, password, attributeList, [], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  const confirmSignUp = async (email: string, code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool
      });

      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  const signOut = () => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }
    setUser(null);
  };

  const getToken = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const currentUser = userPool.getCurrentUser();
      if (!currentUser) {
        console.error('getToken: No current user found');
        resolve(null);
        return;
      }

      currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err) {
          console.error('getToken: Session error', err);
          resolve(null);
        } else if (!session) {
          console.error('getToken: No session returned');
          resolve(null);
        } else {
          resolve(session.getIdToken().getJwtToken());
        }
      });
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        confirmSignUp,
        signOut,
        getToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
