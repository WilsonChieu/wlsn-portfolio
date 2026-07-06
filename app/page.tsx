import { LoaderProvider } from "@/components/LoaderContext";
import Loader from "@/components/Loader";
import Nav from "@/components/Nav";
import Marquee from "@/components/Marquee";
import WorkList from "@/components/WorkList";
import Featured from "@/components/Featured";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <LoaderProvider>
      <Loader />
      <Nav />
      <main>
        <Featured />
        <div className="h-16 md:h-24" />
        <Marquee />
        <WorkList />
        <About />
        <Contact />
      </main>
      <Footer />
    </LoaderProvider>
  );
}
