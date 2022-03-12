import "./deployment-version-update.scss";

import { Renderer } from "@k8slens/extensions";
import React from "react";
import { observable, makeObservable, autorun } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";

@observer
export class DeploymentVersionUpdate extends React.Component<Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Deployment>> {

  @observable isSaving = false;
  @observable data = observable.map<number, { image: string, tag: string }>();

  constructor(props: Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Deployment>) {
    super(props);
    makeObservable(this);
  }

  async componentDidMount() {
    disposeOnUnmount(this, [
      autorun(() => {
        const { object } = this.props;

        if (object) {
          object.spec.template.spec.containers.forEach((container, index) => {
            this.data.set(index, { image: container.image.replace(/(?=:).*/, ""), tag: container.image.replace(/^.*?(?=:)/, "").substring(1) });
          });
        }
      }),
    ]);
  }

  save = async () => {
    const { object } = this.props;

    for (const [index, value] of this.data) {
      object.spec.template.spec.containers[index].image = object.spec.template.spec.containers[index].image.replace(/:.*/, ':' + value.tag);
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
    const containers = Array.from(this.data.entries());

    return (
      <div className="DeploymentVersionUpdateDetail">
        <Renderer.Component.KubeObjectMeta object={object} />
        {
          containers.length > 0 && (
            <>
              <Renderer.Component.DrawerTitle title="Images" />
              {
                containers.map(([index, value]) => (

                  <div key={index} className="data">
                    <div className="name">{value.image}</div>
                    <div className="flex gaps align-flex-start">
                      <Renderer.Component.Input
                        multiLine
                        theme="round-black"
                        className="box grow"
                        value={value.tag}
                        onChange={v => this.data.set(index, { ...value, tag: v })}
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
