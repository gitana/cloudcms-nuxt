export default function ({ query, enablePreview }) {

  if (typeof(query.preview) !== "undefined")
  {
    enablePreview();
  }

}
