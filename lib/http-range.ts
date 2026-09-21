export interface ByteRange {
    start: number;
    end: number;
}

export function parseByteRange(value: string, size: number): ByteRange {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(value);
    if (!match || size <= 0) throw new RangeError("Invalid byte range");

    const [, startValue, endValue] = match;
    if (!startValue && !endValue) throw new RangeError("Invalid byte range");

    if (!startValue) {
        const suffixLength = BigInt(endValue);
        if (suffixLength <= 0) {
            throw new RangeError("Invalid byte range");
        }
        return {
            start: suffixLength >= BigInt(size) ? 0 : size - Number(suffixLength),
            end: size - 1,
        };
    }

    const startValueBigInt = BigInt(startValue);
    const endValueBigInt = endValue ? BigInt(endValue) : BigInt(size - 1);
    if (startValueBigInt >= BigInt(size) || endValueBigInt < startValueBigInt) {
        throw new RangeError("Invalid byte range");
    }
    return {
        start: Number(startValueBigInt),
        end: endValueBigInt >= BigInt(size) ? size - 1 : Number(endValueBigInt),
    };
}
