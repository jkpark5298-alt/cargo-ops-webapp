const handleOCR = async () => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ocr/extract`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (data.flights?.length > 0) {
    router.push(`/flights?flight=${data.flights.join(",")}`);
  }
};
