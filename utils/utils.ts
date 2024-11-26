import axios from "axios";

export async function detectSolanaTokenAddress(
  message: string
): Promise<string[]> {
  // Check if message contains dexscreener URL
  const dexscreenerPattern =
    /dexscreener\.com\/solana\/([1-9A-HJ-NP-Za-km-z]{32,44})/;
  const dexMatch = message.match(dexscreenerPattern);
  const baseURL = "https://api.dexscreener.com/latest/dex/pairs/solana/";

  if (dexMatch) {
    const contractAddress = dexMatch[1];
    const apiUrl = `${baseURL}${contractAddress}`;

    try {
      const response = await axios.get(apiUrl);
      const data = response.data;

      if (data.pairs && data.pairs.length > 0) {
        return [data.pairs[0].baseToken.address];
      }
    } catch (error) {
      console.error(`Error fetching dexscreener API: ${error}`);
      return [contractAddress];
    }
  }

  const pattern = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
  const matches = message.match(pattern) || [];
  return matches.filter((match) => match.length >= 32 && match.length <= 44);
}

// Create a Map to store addresses with timestamps
const addressMap = new Map<string, number>();

export function saveAddress(address: string): void {
  if (!addressMap.has(address)) {
    addressMap.set(address, Date.now());
  }
}

export function loadTrackedAddresses(): Map<string, number> {
  return addressMap;
}

// Additional useful functions you can use:
export function getAddressTimestamp(address: string): number | undefined {
  return addressMap.get(address);
}

export function clearOldAddresses(maxAgeMs: number): void {
  const now = Date.now();
  for (const [address, timestamp] of addressMap) {
    if (now - timestamp > maxAgeMs) {
      addressMap.delete(address);
    }
  }
}
