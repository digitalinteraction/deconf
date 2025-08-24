// NOTE: to be converted to a union type in the future for more methods
export interface LoginRequest {
  token: string;
  payload: {
    emailAddress: string;
  };
  code: number;
  method: "email";
  redirectUri: string;
  uses: number;
}
