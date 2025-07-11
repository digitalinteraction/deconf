import * as jose from "jose";
import { pickProperties } from "./gruber-hacks.ts";

export function trimEmail(input: string) {
  return input.trim().toLowerCase();
}

export const DECONF_OOB = "deconf://oob";

export async function generateJwk(kid = "dev.deconf.app") {
  const { privateKey } = await jose.generateKeyPair("RS256", {
    extractable: true,
  });

  // Export the private key which includes the public key
  const privateJwk = await jose.exportJWK(privateKey);
  privateJwk.alg = "RS256";
  privateJwk.use = "sig";
  privateJwk.kid = kid;

  return privateJwk as Required<jose.JWK>;
}

export function generateJWKS(key: jose.JWK) {
  return {
    keys: [pickProperties(key, ["kty", "e", "use", "kid", "alg", "n"])],
  };
}
