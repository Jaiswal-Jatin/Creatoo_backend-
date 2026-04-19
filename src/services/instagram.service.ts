/**
 * Module: Backend (API Server)
 * File Purpose: Instagram Service. Facilitates OAuth and profile retrieval from the Instagram Graph API.
 * Used By: AuthController, UserController
 * Database Model: N/A
 * Critical: Yes (Auth/Integration)
 */
import axios from 'axios';
import env from '../config/env';

export const getAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: env.INSTAGRAM_CLIENT_ID,
    redirect_uri: env.INSTAGRAM_REDIRECT_URI,
    scope: 'user_profile',
    response_type: 'code'
  });
  return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string) => {
  const data = new URLSearchParams({
    client_id: env.INSTAGRAM_CLIENT_ID,
    client_secret: env.INSTAGRAM_CLIENT_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: env.INSTAGRAM_REDIRECT_URI,
    code
  });
  const res = await axios.post('https://api.instagram.com/oauth/access_token', data);
  return res.data as { access_token: string; user_id: string };
};

export const getProfile = async (userId: string, accessToken: string) => {
  const url = `https://graph.instagram.com/${userId}?fields=id,username&access_token=${accessToken}`;
  const res = await axios.get(url);
  return res.data as { id: string; username: string };
};
