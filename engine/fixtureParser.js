import path from 'path';
import glob from 'glob';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
const markdown = new MarkdownIt();

export default class FixtureParser {
  constructor(root) {
    this.root = path.normalize(root);
  }

  read() {
    this.results = glob.sync(path.join(this.root, '*.md'))
      .map(this.readFile, this)
      // alphabetically
      .sort((a, b) => (a.title.toLowerCase() < b.title.toLowerCase()) ? -1 : 1);
    return Promise.resolve(this.results);
  }

  readFile(src) {
    const meta = matter.read(src);

    if (Object.keys(meta.data).length === 0) {
        throw new Error(`Error while parsing '${src}'.`);
    }

    const summary = markdown.renderInline(meta.content);
    const slug = path.basename(src, '.md');
    const file = path.relative(this.root, src);
    return Object.assign({
      summary,
      slug,
      file,
    }, meta.data);
  }
}
