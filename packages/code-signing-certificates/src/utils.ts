// a hexString is considered negative if it's most significant bit is 1
// because serial numbers use ones' complement notation
// this RFC in section 4.1.2.2 requires serial numbers to be positive
// http://www.ietf.org/rfc/rfc5280.txt
export function toPositiveHex(hexString: string) {
  let mostSiginficantHexAsInt = parseInt(hexString[0], 16);
  if (mostSiginficantHexAsInt < 8) {
    return hexString;
  }
  mostSiginficantHexAsInt -= 8;
  return mostSiginficantHexAsInt.toString(16) + hexString.substring(1);
}
