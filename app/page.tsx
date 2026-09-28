import { LoaderProvider } from "@/components/LoaderContext";
import Loader from "@/components/Loader";
import Nav from "@/components/Nav";
import Marquee from "@/components/Marquee";
import WorkList from "@/components/WorkList";
import Featured from "@/components/Featured";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { getGenres } from "@/lib/works";

export const revalidate = 3600;

export default async function Home() {
  const genres = await getGenres();

  return (
    <LoaderProvider>
      <Loader />
      <Nav />
      <main>
        <Featured />
        <div className="h-16 md:h-24" />
        <Marquee />
        <WorkList genres={genres} />
        <About />
        <Contact />
      </main>
      <Footer />
    </LoaderProvider>
  );
}
