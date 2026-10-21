// pdfmake ships its font bundles without type declarations.
declare module "pdfmake/build/fonts/Roboto" {
  const container: import("pdfmake/interfaces").TFontContainer;
  export default container;
}
