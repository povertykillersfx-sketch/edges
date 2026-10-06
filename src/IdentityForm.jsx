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
  const profiles = portal.profiles ?? [];
  const mentors = portal.mentors ?? [];
  const branded =
    profiles.find((item) => item.id === identity.profileId) ?? profiles[0] ?? null;
  const approvedMentors = mentors.filter((item) => item.status === "approved");

  function setIdentity(patch) {
    onChange({ identity: { ...identity, ...patch } });
  }

  function pushBrand(profile, patch) {
    const next = { ...profile, ...patch };
    onChange({
      identity: { ...identity, profileId: profile.id },
      profiles: profiles.map((item) => (item.id === profile.id ? next : item)),
      keys: keys.map((item) =>
        item.profileId === profile.id ? { ...item, eaName: next.name, picture: next.picture } : item
      ),
    });
  }

  async function choosePicture(file) {
    if (!file || !branded) return;
    try {
      const picture = await fitImage(file);
      pushBrand(branded, { picture });
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
          The EA name and picture are sent to every license generated for this EA, and they lead the home screen.
        </p>
        {!branded ? (
          <p className="setting-copy">Create an EA profile first.</p>
        ) : (
          <form className="portal-form" onSubmit={(event) => event.preventDefault()}>
            {profiles.length > 1 && (
              <label>
                EA
                <select
                  value={branded.id}
                  onChange={(event) => setIdentity({ profileId: event.target.value })}
                >
                  {profiles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              EA name
              <input
                value={branded.name}
                onChange={(event) => pushBrand(branded, { name: event.target.value.slice(0, 40) })}
                placeholder="EA name"
              />
            </label>
            <label className="brand-upload">
              {branded.picture ? <img src={branded.picture} alt="" /> : <span>Upload EA picture</span>}
              <input
                className="brand-file"
                type="file"
                accept="image/*"
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
