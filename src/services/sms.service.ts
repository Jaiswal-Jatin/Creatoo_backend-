import axios from 'axios';
import env from '../config/env';

export const sendOtp = async (mobile: string, otp: string): Promise<void> => {
  // dev fallback (no creds) – do not 500 the request, just log
  if (!env.MSG91_AUTHKEY || !env.MSG91_TEMPLATE_ID_LOGIN) {
    console.log(`[DEV] OTP for ${mobile}: ${otp} (MSG91 not configured)`);
    return;
  }

  const msisdn = mobile.startsWith('91') ? mobile : `91${mobile}`;
  const payload = {
    template_id: env.MSG91_TEMPLATE_ID_LOGIN,
    short_url: '0',
    recipients: [{ mobiles: msisdn, var1: otp }],
  };

  try {
    const resp = await axios.post('https://control.msg91.com/api/v5/flow', payload, {
      headers: { authkey: env.MSG91_AUTHKEY, 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    if (resp.status < 200 || resp.status >= 300) {
      console.error('MSG91 non-2xx:', resp.status, resp.statusText, resp.data);
    }
  } catch (err: any) {
    console.error('MSG91 sendOtp failed:', err?.response?.data || err?.message);
    // do not throw: we want endpoint to return 200 with debug OTP in dev; in prod you can throw
  }
};
