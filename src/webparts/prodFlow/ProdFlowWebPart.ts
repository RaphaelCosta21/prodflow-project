import * as React from "react";
import * as ReactDom from "react-dom";
import { Version } from "@microsoft/sp-core-library";
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from "@microsoft/sp-property-pane";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";

import * as strings from "ProdFlowWebPartStrings";
import { QueryClient } from "@tanstack/react-query";
import ProdFlowApp, { IProdFlowAppProps } from "./app/ProdFlow";
import { SPService } from "./app/services/SPService";
import { createQueryClient } from "./app/api/queryClient";

export interface IProdFlowWebPartProps {
  description: string;
}

export default class ProdFlowWebPart extends BaseClientSideWebPart<IProdFlowWebPartProps> {
  private _queryClient!: QueryClient;

  public render(): void {
    const element: React.ReactElement<IProdFlowAppProps> = React.createElement(
      ProdFlowApp,
      {
        context: this.context,
        queryClient: this._queryClient,
      },
    );

    ReactDom.render(element, this.domElement);
  }

  protected onInit(): Promise<void> {
    SPService.init(this.context);
    this._queryClient = createQueryClient();
    return Promise.resolve();
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse("1.0");
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription,
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField("description", {
                  label: strings.DescriptionFieldLabel,
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
