import "./deployment-version-update.scss";

import { Renderer } from "@k8slens/extensions";
import React from "react";
import { observable, makeObservable, autorun } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";

// Based on https://regex101.com/r/nmSDPA/1
const imageRegex = /^(?<name>(?:(?<domain>(?:localhost|[\w-]+(?:\.[\w-]+)+)(?::\d+)?|\w+:\d+)\/)?(?<image>[a-z0-9_.-]+(?:\/[a-z0-9_.-]+)*))(?::(?<tag>\w[\w.-]{0,127}))?(?:@(?<digest>[A-Za-z][A-Za-z0-9]*(?:[+.-_][A-Za-z][A-Za-z0-9]*)*:[0-9a-fA-F]{32,}))?$/;

@observer
export class DeploymentVersionUpdate extends React.Component<Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Deployment>> {

  @observable isSaving = false;
  @observable containers = observable.map<number, { image: string, tag: string, name: string }>();
  @observable initContainers = observable.map<number, { image: string, tag: string, name: string }>();

  constructor(props: Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Deployment>) {
    super(props);
    makeObservable(this);
  }

  async componentDidMount() {
    disposeOnUnmount(this, [
      autorun(() => {
        const { object } = this.props;

        console.log(object);

        const parse = (container: Renderer.K8sApi.IPodContainer) => {
          const match = container.image.match(imageRegex);
          return {
            image: match.groups.name,
            tag: (match.groups.tag ?? 'latest') + (match.groups.digest ? '@' + match.groups.digest : ''),
            name: container.name
          }
        }

        if (object) {
          object.spec.template.spec.containers.forEach((container, index) => {
            this.containers.set(index, parse(container));
          });
          object.spec.template.spec.initContainers.forEach((container, index) => {
            this.initContainers.set(index, parse(container));
          });
        }
      }),
    ]);
  }

  save = async () => {
    const { object } = this.props;

    for (const [index, value] of this.containers) {
      object.spec.template.spec.containers[index].image = value.image + ':' + value.tag;
    }
    for (const [index, value] of this.initContainers) {
      object.spec.template.spec.initContainers[index].image = value.image + ':' + value.tag;
    }

    try {
      this.isSaving = true;
      await Renderer.K8sApi.deploymentApi.update({
        namespace: object.getNs(),
        name: object.getName(),
      }, object);
      Renderer.Component.Notifications.ok(
        <p>
          <>Image tags successfully updated.</>
        </p>,
      );
    } catch (error) {
      Renderer.Component.Notifications.error(`Failed to update image tag: ${error}`);
    } finally {
      this.isSaving = false;
    }
  };


  render() {
    const { object } = this.props;
    const containers = Array.from(this.containers.entries());
    const initContainers = Array.from(this.initContainers.entries());

    return (
      <div className="DeploymentVersionUpdateDetail">
        <Renderer.Component.KubeObjectMeta object={object} />
        {
          initContainers.length > 0 && (
            <>
              <Renderer.Component.DrawerTitle children={`InitContainer image${initContainers.length > 1 ? 's' : ''}`} />
              {
                initContainers.map(([index, value]) => (

                  <div key={index} className="data">
                    <div className="name">{value.name + ' - ' + value.image}</div>
                    <div className="flex gaps align-flex-start">
                      <Renderer.Component.Input
                        multiLine
                        theme="round-black"
                        className="box grow"
                        value={value.tag}
                        onChange={v => this.initContainers.set(index, { ...value, tag: v })}
                      />
                    </div>
                  </div>
                ))
              }
              <Renderer.Component.Button
                primary
                label="Save" waiting={this.isSaving}
                className="save-btn"
                onClick={this.save}
              />
            </>
          )
        }
        {
          containers.length > 0 && (
            <>
              <Renderer.Component.DrawerTitle children={`Container image${containers.length > 1 ? 's' : ''}`} />
              {
                containers.map(([index, value]) => (

                  <div key={index} className="data">
                    <div className="name">{value.name + ' - ' + value.image}</div>
                    <div className="flex gaps align-flex-start">
                      <Renderer.Component.Input
                        multiLine
                        theme="round-black"
                        className="box grow"
                        value={value.tag}
                        onChange={v => this.containers.set(index, { ...value, tag: v })}
                      />
                    </div>
                  </div>
                ))
              }
              <Renderer.Component.Button
                primary
                label="Save" waiting={this.isSaving}
                className="save-btn"
                onClick={this.save}
              />
            </>
          )
        }
      </div>
    );
  }
}
