import SiteHeader from "./SiteHeader";
type Props = {
  genres: { slug: string; title: string }[];
  current: string;
};
export default function WorkHeader(props: Props) {
  return <SiteHeader {...props} />;
}
