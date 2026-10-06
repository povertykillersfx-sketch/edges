import { useId, useState } from "react";

function fitImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const max = 480;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unread"));
    };
    image.src = url;
  });
}

export function IdentityForm({ portal, onChange }) {
  const [photoError, setPhotoError] = useState("");
  const listId = useId();
  const identity = portal.identity ?? {
    firstName: "",
    lastName: "",
    email: "",
    mentorName: "",
    licenseId: "",
  };
  const keys = portal.keys ?? [];
  const mentors = portal.mentors ?? [];
  const synced = keys.find((item) => item.id === identity.licenseId);
  const approvedMentors = mentors.filter((item) => item.status === "approved");

  function setIdentity(patch) {
    onChange({ identity: { ...identity, ...patch } });
  }

  function setBrand(patch) {
    if (!synced) return;
    onChange({
      keys: keys.map((item) => (item.id === synced.id ? { ...item, ...patch } : item)),
    });
  }

  async function choosePicture(file) {
    if (!file || !synced) return;
    try {
      const picture = await fitImage(file);
      setBrand({ picture });
      setPhotoError("");
    } catch {
      setPhotoError("That picture could not be read.");
    }
  }

  return (
    <>
      <section className="setting-block">
        <p className="setting-title">Personal information</p>
        <form className="portal-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            Name
            <input
              value={identity.firstName}
              onChange={(event) => setIdentity({ firstName: event.target.value })}
              placeholder="Name"
              autoComplete="given-name"
            />
          </label>
          <label>
            Last name
            <input
              value={identity.lastName}
              onChange={(event) => setIdentity({ lastName: event.target.value })}
              placeholder="Last name"
              autoComplete="family-name"
            />
          </label>
          <label>
            Email address
            <input
              type="email"
              value={identity.email}
              onChange={(event) => setIdentity({ email: event.target.value })}
              placeholder="Email address"
              autoComplete="email"
            />
          </label>
          <label>
            Mentor name
            <input
              value={identity.mentorName}
              onChange={(event) => setIdentity({ mentorName: event.target.value })}
              placeholder="Mentor name"
              list={listId}
            />
            <datalist id={listId}>
              {approvedMentors.map((item) => (
                <option key={item.id} value={item.name} />
              ))}
            </datalist>
          </label>
        </form>
      </section>
      <section className="setting-block">
        <p className="setting-title">Branding</p>
        <p className="setting-copy">
          Upload the EA picture for a license key from the mentor. The EA name and picture lead the home screen.
        </p>
        {keys.length === 0 ? (
          <p className="setting-copy">Generate a license key, then choose it here.</p>
        ) : (
          <form className="portal-form" onSubmit={(event) => event.preventDefault()}>
            <label>
              License key
              <select
                value={identity.licenseId}
                onChange={(event) => setIdentity({ licenseId: event.target.value })}
              >
                <option value="">Choose a license key</option>
                {keys.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code}
                    {item.status === "revoked" ? " · revoked" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              EA name
              <input
                value={synced?.eaName ?? ""}
                onChange={(event) => setBrand({ eaName: event.target.value.slice(0, 40) })}
                placeholder="EA name"
                disabled={!synced}
              />
            </label>
            <label className="brand-upload">
              {synced?.picture ? (
                <img src={synced.picture} alt="" />
              ) : (
                <span>{synced ? "Upload EA picture" : "Choose a license key first"}</span>
              )}
              <input
                className="brand-file"
                type="file"
                accept="image/*"
                disabled={!synced}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  choosePicture(file);
                }}
              />
            </label>
            {photoError && <p className="form-error">{photoError}</p>}
          </form>
        )}
      </section>
    </>
  );
}
