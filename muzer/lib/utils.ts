import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const YT_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?!.*\blist=)(?:.*&)?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&]\S+)?$/;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* Explanation:if you want to read
1. **Imports:**
   - `clsx`: This is a utility that conditionally joins class names. It allows you to pass in any combination of strings, objects, or arrays, and it returns a single string with all the class names combined.
   - `twMerge`: This utility is used to merge class names that are specific to Tailwind CSS, resolving conflicts by keeping the last one in the order if there are overlapping utilities.

2. **YT_REGEX (Regular Expression for YouTube URLs):**
   - This regular expression is designed to match YouTube URLs, whether they are `https://youtube.com`, `https://youtu.be`, or other variants. It captures the 11-character video ID from a YouTube video URL. It ensures that:
     - The URL is a valid YouTube link.
     - The video ID is extracted correctly.

3. **`cn` function:**
   - This function is a utility that combines `clsx` and `twMerge`.
   - It accepts any number of class values (strings, objects, or arrays of classes).
   - First, it uses `clsx` to join all the class names, and then it applies `twMerge` to ensure any conflicting Tailwind CSS utilities are resolved correctly. This is especially useful when dynamically generating class names in frameworks like React. */