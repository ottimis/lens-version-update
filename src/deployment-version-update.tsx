import "./deployment-version-update.scss";

import { Renderer } from "@k8slens/extensions";
import React from "react";
import { observable, makeObservable, autorun } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { Deployment } from './classes/deployment';

@observer
export class DeploymentVersionUpdate extends React.Component<Renderer.Component.KubeObjectDetailsProps<Deployment>> {

  @observable isSaving = false;
  @observable containers = observable.map<number, { image: string, tag: string, name: string }>();
  @observable initContainers = observable.map<number, { image: string, tag: string, name: string }>();

  constructor(props: Renderer.Component.KubeObjectDetailsProps<Deployment>) {
    super(props);
    makeObservable(this);
  }

  async componentDidMount() {
    disposeOnUnmount(this, [
      autorun(() => {
        const { object } = this.props;

        console.log(object);
        if (object) {
          object.spec.template.spec.containers.forEach((container, index) => {
            this.containers.set(index, { image: container.image.replace(/(?=:).*/, ""), tag: container.image.replace(/^.*?(?=:)/, "").substring(1), name: container.name });
          });
          object.spec.template.spec.initContainers.forEach((container, index) => {
            this.initContainers.set(index, { image: container.image.replace(/(?=:).*/, ""), tag: container.image.replace(/^.*?(?=:)/, "").substring(1), name: container.name });
          });
        }
      }),
    ]);
  }

  save = async () => {
    const { object } = this.props;

    for (const [index, value] of this.containers) {
      object.spec.template.spec.containers[index].image = object.spec.template.spec.containers[index].image.replace(/:.*/, ':' + value.tag);
    }
    for (const [index, value] of this.initContainers) {
      object.spec.template.spec.initContainers[index].image = object.spec.template.spec.initContainers[index].image.replace(/:.*/, ':' + value.tag);
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
              <Renderer.Component.DrawerTitle title="InitContainer images" />
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
              <Renderer.Component.DrawerTitle title="Container images" />
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
