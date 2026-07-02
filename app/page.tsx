import { LoaderProvider } from "@/components/LoaderContext";
import Loader from "@/components/Loader";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
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
        <Hero />
        <Marquee />
        <WorkList />
        <Featured />
        <About />
        <Contact />
      </main>
      <Footer />
    </LoaderProvider>
  );
}
