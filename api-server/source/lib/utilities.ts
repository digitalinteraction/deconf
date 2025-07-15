import * as jose from "jose";
import { pickProperties } from "./gruber-hacks.ts";
import {
  AuthzToken,
  SignTokenOptions,
  SqlDependency,
  TokenService,
} from "gruber";
import { ServiceTokenTable } from "./tables.ts";

export function trimEmail(input: string) {
  return input.trim().toLowerCase();
}

export const DECONF_OOB = "deconf://oob";

export async function generateJwk(kid = "dev.deconf.app") {
  const { publicKey, privateKey } = await jose.generateKeyPair("RS256", {
    extractable: true,
  });

  const key = {
    publicKey: await jose.exportJWK(publicKey),
    privateKey: await jose.exportJWK(privateKey),
  };

  // Augment the public keys
  key.publicKey.alg = "RS256";
  key.publicKey.use = "sig";
  key.publicKey.kid = kid;

  // Augment the private keys
  key.privateKey.alg = "RS256";
  key.privateKey.use = "sig";
  key.privateKey.kid = kid;

  return key;
}

export function getPublicJwk(key: jose.JWK) {
  return pickProperties(key, ["kty", "e", "use", "kid", "alg", "n"]);
}

export function generateJWKS(key: jose.JWK) {
  return {
    keys: [getPublicJwk(key)],
  };
}

export class ServiceTokenService implements TokenService {
  sql;
  constructor(sql: SqlDependency) {
    this.sql = sql;
  }

  async verify(token: string): Promise<AuthzToken | null> {
    const record = await ServiceTokenTable.selectOne(
      this.sql,
      this.sql`token = ${token}`,
    );
    return record ? { scope: record.scope } : null;
  }
  sign(scope: string, options?: SignTokenOptions): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
