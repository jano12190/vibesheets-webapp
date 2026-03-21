export const config = {
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || 'https://6uo5fepf5h.execute-api.us-east-1.amazonaws.com',
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_uoofoKNXk',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '6rkrjtjnod5en1hac1nklr43g2',
    region: 'us-east-1'
  }
};
