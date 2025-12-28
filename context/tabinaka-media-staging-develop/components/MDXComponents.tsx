/**
 * MDXコンポーネント設定
 * _app.tsxから分離
 */

// Default MDX component settings
const components = {
  h1: (props: any) => (
    <h1 className="text-3xl font-bold text-gray-900 mb-6" {...props} />
  ),
  h2: (props: any) => (
    <h2 className="text-2xl font-semibold text-gray-800 mb-4" {...props} />
  ),
  h3: (props: any) => (
    <h3 className="text-xl font-medium text-gray-700 mb-3" {...props} />
  ),
  p: (props: any) => (
    <p className="text-gray-600 mb-4 leading-relaxed" {...props} />
  ),
  ul: (props: any) => <ul className="mb-4 pl-6 list-disc" {...props} />,
  ol: (props: any) => <ol className="mb-4 pl-6 list-decimal" {...props} />,
  li: (props: any) => <li className="mb-2 text-gray-600" {...props} />,
  blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-primary-500 pl-4 italic text-gray-700 bg-gray-50 py-2 my-6"
      {...props}
    />
  ),
  pre: (props: any) => (
    <pre
      className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto my-6"
      {...props}
    />
  ),
  code: (props: any) => (
    <code
      className="bg-gray-100 text-primary-500 px-1 py-0.5 rounded text-sm"
      {...props}
    />
  ),
  a: (props: any) => (
    <a className="text-primary-500 hover:underline" {...props} />
  ),
};

export default components;
