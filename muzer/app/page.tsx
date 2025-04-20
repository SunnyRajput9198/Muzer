import Image from "next/image";
import Appbar from "./components/Appbar";
console.log(process.env.GOOGLE_CLIENT_ID)
console.log(process.env.GOOGLE_CLIENT_SECRET)
export default function Home() {
  return (
   <div>
    <Appbar></Appbar>
   </div>
  );
}
