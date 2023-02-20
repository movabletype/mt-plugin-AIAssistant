interface Window {
  MT: {
    Util: {
      isMobileView: () => boolean;
    };
  };
  DOM: {
    getFormData: (element: HTMLFormElement) => Record<string, string>;
  };
  ScriptURI: string;
  CMSScriptURI: string;
  StaticURI: string;
}

interface JQuery {
  modal: any;
  mtModal: any;
}
